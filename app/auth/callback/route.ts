/**
 * OAuth callback for Supabase sign-in providers (Google, etc.). The provider
 * round-trips through Supabase, which redirects here with a short-lived
 * `code`. We exchange it for a session cookie and bounce the user into the
 * dashboard (or onboarding, if they're brand new — requireBusiness handles
 * that downstream).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/auth/error?error=oauth_callback_missing_code`,
  );
}
