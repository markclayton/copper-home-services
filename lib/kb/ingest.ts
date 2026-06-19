/**
 * KB ingest orchestrator. Takes raw text + a kb_documents row, chunks it,
 * embeds the chunks, persists, and stamps the row ready/failed.
 *
 * Callers:
 *  - The Inngest kb/document-uploaded worker (for PDF/DOCX uploads)
 *  - The Inngest kb/crawl-requested worker (per crawled page)
 *
 * Idempotent on contentHash: if the same business already has a document
 * with the same parsed-text hash, we no-op. This makes Inngest retries
 * safe and prevents re-embedding the same PDF on re-upload.
 */

import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { kbChunks, kbDocuments, type KbDocument } from "@/lib/db/schema";
import { chunk } from "./chunker";
import { embedMany } from "./embeddings";

export type IngestSource =
  | { kind: "upload"; title: string; sourceUrl?: string }
  | { kind: "crawl"; title: string; sourceUrl: string; crawlJobId: string };

export type IngestResult = {
  documentId: string;
  status: "ready" | "deduped" | "failed";
  chunkCount: number;
  tokenCount: number;
  error?: string;
};

export function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Ingest a single source into the per-business KB. Returns the resulting
 * kb_documents id and the chunk/token counts so the worker can write a
 * useful audit event.
 */
export async function ingestText(
  businessId: string,
  source: IngestSource,
  text: string,
): Promise<IngestResult> {
  const trimmed = text.trim();
  if (trimmed.length < 50) {
    return {
      documentId: "",
      status: "failed",
      chunkCount: 0,
      tokenCount: 0,
      error: "text too short",
    };
  }

  const contentHash = hashContent(trimmed);

  // Dedup: if a doc with this hash already exists for the business, skip.
  const [dupe] = await db
    .select({ id: kbDocuments.id, status: kbDocuments.status })
    .from(kbDocuments)
    .where(
      sql`${kbDocuments.businessId} = ${businessId} AND ${kbDocuments.contentHash} = ${contentHash}`,
    )
    .limit(1);
  if (dupe && dupe.status === "ready") {
    return {
      documentId: dupe.id,
      status: "deduped",
      chunkCount: 0,
      tokenCount: 0,
    };
  }

  const [doc] = await db
    .insert(kbDocuments)
    .values({
      businessId,
      sourceType: source.kind,
      title: source.title.slice(0, 200),
      sourceUrl: "sourceUrl" in source ? source.sourceUrl : null,
      contentHash,
      status: "processing",
      crawlJobId: "crawlJobId" in source ? source.crawlJobId : null,
    })
    .returning({ id: kbDocuments.id });

  try {
    const chunks = chunk(trimmed);
    if (chunks.length === 0) {
      await db
        .update(kbDocuments)
        .set({ status: "failed", error: "no chunks produced", updatedAt: new Date() })
        .where(eq(kbDocuments.id, doc.id));
      return {
        documentId: doc.id,
        status: "failed",
        chunkCount: 0,
        tokenCount: 0,
        error: "no chunks",
      };
    }

    const { vectors, totalTokens } = await embedMany(chunks.map((c) => c.content));

    await db.insert(kbChunks).values(
      chunks.map((c, i) => ({
        businessId,
        documentId: doc.id,
        chunkIndex: i,
        content: c.content,
        embedding: vectors[i],
        tokenCount: c.tokenCount,
      })),
    );

    await db
      .update(kbDocuments)
      .set({
        status: "ready",
        chunkCount: chunks.length,
        tokenCount: totalTokens,
        updatedAt: new Date(),
      })
      .where(eq(kbDocuments.id, doc.id));

    return {
      documentId: doc.id,
      status: "ready",
      chunkCount: chunks.length,
      tokenCount: totalTokens,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(kbDocuments)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(kbDocuments.id, doc.id));
    return {
      documentId: doc.id,
      status: "failed",
      chunkCount: 0,
      tokenCount: 0,
      error: message,
    };
  }
}

/** Helper for callers that want to delete a document and its chunks. */
export async function deleteDocument(
  businessId: string,
  documentId: string,
): Promise<void> {
  // Chunks cascade via FK; deleting the document is sufficient.
  void businessId; // RLS layer handles auth — this fn runs server-side.
  await db.delete(kbDocuments).where(eq(kbDocuments.id, documentId));
}

export type { KbDocument };
