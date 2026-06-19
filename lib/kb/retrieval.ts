/**
 * Mid-call retrieval: given a query, return the top-K text chunks for a
 * business by cosine similarity.
 *
 * Speed target: <100ms p95 on a healthy HNSW index, since the Vapi tool
 * loop blocks on us. That's why we use raw SQL with the `<=>` cosine
 * operator instead of constructing the vector in JS and comparing.
 *
 * Returns null if the business has no embedded chunks yet — the handler
 * uses that to fall through to the structured KB.
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { kbChunks } from "@/lib/db/schema";
import { embedOne, vectorLiteral } from "./embeddings";

export type RetrievedChunk = {
  documentId: string;
  content: string;
  /** Cosine distance (0 = identical, 2 = opposite). Lower = closer. */
  distance: number;
};

const DEFAULT_K = 4;
const DISTANCE_THRESHOLD = 0.55; // exclude clearly unrelated chunks

export async function searchKnowledge(args: {
  businessId: string;
  query: string;
  k?: number;
}): Promise<RetrievedChunk[]> {
  const trimmed = args.query.trim();
  if (!trimmed) return [];
  const k = args.k ?? DEFAULT_K;

  const { vector } = await embedOne(trimmed);
  const literal = vectorLiteral(vector);

  // Drizzle's `sql` template tags interpolate values safely.
  const rows = await db.execute(sql`
    SELECT
      document_id AS "documentId",
      content,
      embedding <=> ${literal}::vector AS distance
    FROM ${kbChunks}
    WHERE business_id = ${args.businessId}
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${k}
  `);

  const out: RetrievedChunk[] = [];
  for (const raw of rows as unknown as Array<Record<string, unknown>>) {
    const distance = Number(raw.distance);
    const documentId = typeof raw.documentId === "string" ? raw.documentId : "";
    const content = typeof raw.content === "string" ? raw.content : "";
    if (!documentId || !content) continue;
    if (Number.isNaN(distance) || distance > DISTANCE_THRESHOLD) continue;
    out.push({ documentId, content, distance });
  }
  return out;
}
