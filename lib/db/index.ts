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
  // connections. max: 5 keeps each Next.js module copy from hoarding
  // connections during dev hot-reload.
  const queryClient = postgres(env.DATABASE_URL, {
    prepare: false,
    max: 5,
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
