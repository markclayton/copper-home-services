import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

type Db = PostgresJsDatabase<typeof schema>;

let cached: Db | null = null;

function getDb(): Db {
  if (cached) return cached;
  // prepare: false is required when going through Supabase's pgbouncer
  // transaction pooler — prepared statements aren't shared across pooled
  // connections.
  //
  // Connection pool sizing: on Vercel each warm function instance holds its
  // own pool. With many warm instances + poll-heavy pages (setup wait,
  // dashboard refresh), max=5 per instance × N instances quickly exhausts
  // the upstream pooler. max=1 in serverless lets warm instances reuse a
  // single connection and limits total fan-out. Locally we want more
  // because Next.js dev hot-reload spawns multiple module copies.
  //
  // idle_timeout closes connections that sit idle for >20s — important on
  // serverless to release upstream pooler slots when a function goes cold.
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const queryClient = postgres(env.DATABASE_URL, {
    prepare: false,
    max: isServerless ? 1 : 5,
    idle_timeout: isServerless ? 20 : undefined,
    max_lifetime: isServerless ? 60 * 5 : undefined,
  });
  cached = drizzle(queryClient, { schema, casing: "snake_case" });
  return cached;
}

/**
 * Lazy proxy: defers connection setup (and env validation) to first use.
 * Safe to import at module top-level in route handlers without forcing
 * env validation during `next build`.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop: string | symbol) {
    const target = getDb() as unknown as Record<string | symbol, unknown>;
    const value = target[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});

export type { Db };
export { schema };
