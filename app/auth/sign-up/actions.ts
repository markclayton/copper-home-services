"use server";

import { isEmailAllowlisted } from "@/lib/auth/allowlist";

/**
 * Used by the email/password sign-up form to check the allowlist before
 * calling Supabase's signUp. Keeps the allowlist env var server-only.
 */
export async function checkSignupAllowed(email: string): Promise<{
  allowed: boolean;
}> {
  return { allowed: isEmailAllowlisted(email) };
}
