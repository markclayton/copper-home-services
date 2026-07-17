/**
 * OAuth callback for Supabase sign-in providers (Google, etc.). The provider
 * round-trips through Supabase, which redirects here with a short-lived
 * `code`. We exchange it for a session cookie and bounce the user into the
 * dashboard (or onboarding, if they're brand new — requireBusiness handles
 * that downstream).
 *
 * Also gates the private beta: if SIGNUP_ALLOWLIST is set and a *new*
 * user's email isn't on it, we delete the freshly-created Supabase auth
 * user and redirect to /auth/waitlist. Existing users (anyone who already
 * has a business in our DB) bypass the gate.
 */

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { isEmailAllowlisted } from "@/lib/auth/allowlist";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  TERMS_ACCEPTANCE_COOKIE,
  TERMS_ACCEPTANCE_META_KEY,
  TERMS_VERSION_META_KEY,
} from "@/lib/legal";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=oauth_callback_missing_code`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error?.message ?? "oauth_exchange_failed")}`,
    );
  }

  const userId = data.user.id;
  const email = data.user.email ?? null;

  // Existing-user fast path: if this auth user already owns a business
  // they're past the gate. Allowlist changes don't retroactively lock out
  // tenants who've already onboarded.
  const [existingBusiness] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);

  if (!existingBusiness && !isEmailAllowlisted(email)) {
    // Brand-new user, not on the allowlist. Clear the session and delete
    // the auth row so they can request access and try again later without
    // a stale account hanging around.
    await supabase.auth.signOut();
    try {
      await getSupabaseAdmin().auth.admin.deleteUser(userId);
    } catch (err) {
      console.error("[oauth-gate] failed to delete blocked user", {
        userId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return NextResponse.redirect(`${origin}/auth/waitlist`);
  }

  // Consume the terms-acceptance cookie set by the signup page before it
  // kicked off Google OAuth, and write the values into the user's metadata.
  // Only writes on new users (no existing business row) so returning users
  // signing in via Google don't have their prior acceptance overwritten with
  // a fresh timestamp.
  if (!existingBusiness) {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(TERMS_ACCEPTANCE_COOKIE)?.value;
    if (rawCookie) {
      try {
        const parsed = JSON.parse(rawCookie) as {
          acceptedAt?: string;
          version?: string;
        };
        if (parsed.acceptedAt && parsed.version) {
          const currentMeta =
            (data.user.user_metadata as Record<string, unknown> | null) ?? {};
          await supabase.auth.updateUser({
            data: {
              ...currentMeta,
              [TERMS_ACCEPTANCE_META_KEY]: parsed.acceptedAt,
              [TERMS_VERSION_META_KEY]: parsed.version,
            },
          });
        }
      } catch (err) {
        // Malformed cookie shouldn't block sign-in — log and continue.
        console.error("[oauth-callback] failed to parse terms cookie", {
          userId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      cookieStore.delete(TERMS_ACCEPTANCE_COOKIE);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
