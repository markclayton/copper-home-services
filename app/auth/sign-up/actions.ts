"use server";

import { cookies } from "next/headers";
import { isEmailAllowlisted } from "@/lib/auth/allowlist";
import {
  TERMS_ACCEPTANCE_COOKIE,
  TERMS_ACCEPTANCE_COOKIE_TTL_SECONDS,
  TERMS_VERSION,
} from "@/lib/legal";

/**
 * Used by the email/password sign-up form to check the allowlist before
 * calling Supabase's signUp. Keeps the allowlist env var server-only.
 */
export async function checkSignupAllowed(email: string): Promise<{
  allowed: boolean;
}> {
  return { allowed: isEmailAllowlisted(email) };
}

/**
 * Bridge terms acceptance across the Google OAuth redirect. The signup
 * page calls this right before starting the OAuth flow — we drop an
 * HTTPOnly cookie carrying the acceptance timestamp and version, and the
 * /auth/callback route reads it back and writes it into the user's
 * metadata once we have a session.
 *
 * Short TTL: acceptance is only meaningful for this specific signup
 * attempt. If the user bails and comes back later, they'll click the box
 * again.
 */
export async function recordTermsAcceptanceForOauth(): Promise<void> {
  const acceptedAt = new Date().toISOString();
  const cookieStore = await cookies();
  cookieStore.set({
    name: TERMS_ACCEPTANCE_COOKIE,
    value: JSON.stringify({ acceptedAt, version: TERMS_VERSION }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TERMS_ACCEPTANCE_COOKIE_TTL_SECONDS,
  });
}
