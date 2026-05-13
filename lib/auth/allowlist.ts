import { env } from "@/lib/env";

/**
 * Private-beta gate. Returns true if the email should be allowed to create
 * a new account. When SIGNUP_ALLOWLIST is unset, the gate is off and
 * everyone passes — that's the local-dev default.
 *
 * Existing users (those who already have a business tied to their auth
 * user) bypass this check; the gate only applies to brand-new signups.
 * Enforcement lives in three places:
 *   - components/sign-up-form.tsx (email/password signup)
 *   - app/auth/callback/route.ts (Google OAuth callback)
 *   - lib/onboarding/draft-business.ts (defense-in-depth on /onboard)
 */
export function isEmailAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;

  const raw = env.SIGNUP_ALLOWLIST;
  if (!raw) return true; // gate disabled when unset

  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (list.length === 0) return true; // empty string treated as unset

  return list.includes(email.toLowerCase());
}

/**
 * True when the private-beta gate is active. Used by UI to decide whether
 * to show "request access" copy vs. normal signup CTAs.
 */
export function isAllowlistActive(): boolean {
  const raw = env.SIGNUP_ALLOWLIST;
  if (!raw) return false;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0;
}
