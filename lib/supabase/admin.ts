import { createClient } from "@supabase/supabase-js";
import { env, requireEnv } from "@/lib/env";

let cached: ReturnType<typeof createClient> | null = null;

/**
 * Service-role Supabase client for server-only operations like creating users
 * via the admin API. NEVER import this from client components.
 */
export function getSupabaseAdmin() {
  if (cached) return cached;
  cached = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  return cached;
}
