/**
 * OpenAI embeddings client — narrow surface used by KB ingest and the
 * mid-call search_knowledge tool.
 *
 * Model: text-embedding-3-small (1536 dim, cosine, ~$0.02/1M tokens).
 * Cheap enough that batching is just a latency optimization, not a cost
 * one — but we batch anyway because each request adds ~150ms RTT and a
 * 30-page crawl would otherwise be 30 sequential calls.
 *
 * Raw fetch on purpose: a dedicated SDK adds 200KB of bundle weight for
 * one HTTP call. Same pattern as lib/voice/vapi.ts.
 */

import { requireEnv } from "@/lib/env";

const OPENAI_BASE = "https://api.openai.com/v1";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIM = 1536;
const MAX_BATCH = 100;

type EmbeddingResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
};

/**
 * Embed an array of strings. Returns vectors in input order. Splits into
 * batches of MAX_BATCH transparently.
 */
export async function embedMany(inputs: string[]): Promise<{
  vectors: number[][];
  totalTokens: number;
}> {
  if (inputs.length === 0) return { vectors: [], totalTokens: 0 };

  const apiKey = requireEnv("OPENAI_API_KEY");
  const vectors: number[][] = new Array(inputs.length);
  let totalTokens = 0;

  for (let offset = 0; offset < inputs.length; offset += MAX_BATCH) {
    const batch = inputs.slice(offset, offset + MAX_BATCH);
    const res = await fetch(`${OPENAI_BASE}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI embeddings ${res.status}: ${text}`);
    }
    const data = (await res.json()) as EmbeddingResponse;
    totalTokens += data.usage.total_tokens;
    for (const entry of data.data) {
      vectors[offset + entry.index] = entry.embedding;
    }
  }

  return { vectors, totalTokens };
}

/** Embed a single string. Convenience wrapper around embedMany. */
export async function embedOne(input: string): Promise<{
  vector: number[];
  tokens: number;
}> {
  const { vectors, totalTokens } = await embedMany([input]);
  return { vector: vectors[0], tokens: totalTokens };
}

/**
 * pgvector reads/writes vectors as text in the form '[0.1,0.2,...]'. The
 * drizzle vector column handles this transparently for inserts when given
 * a number[], but raw SQL queries (like the cosine search) need to pass
 * the literal — so we expose a formatter here.
 */
export function vectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
