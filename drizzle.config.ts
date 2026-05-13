import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// drizzle-kit uses prepared statements which the Supabase transaction
// pooler (port 6543) strips. Prefer DIRECT_URL when set — that's a direct
// or session-pooler string suitable for migrations. Falls back to
// DATABASE_URL for backward compatibility with single-URL setups.
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl!,
  },
  schemaFilter: ["public"],
  casing: "snake_case",
  verbose: true,
  strict: true,
});
