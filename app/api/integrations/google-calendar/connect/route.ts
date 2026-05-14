/**
 * Kicks off the Google Calendar OAuth flow. The signed-in user is redirected
 * to Google's consent screen; on approval Google sends them back to our
 * /callback route with an authorization code.
 *
 * Scopes:
 *   - calendar.events   → insert / update / delete events
 *   - calendar.freebusy → freeBusy queries to compute open slots
 *   - userinfo.email    → display the connected Gmail in the dashboard
 *
 * We force `prompt=consent` + `access_type=offline` so Google always returns
 * a refresh token (otherwise re-consenting users only get an access token
 * and we lose long-lived access).
 */

import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { env } from "@/lib/env";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const STATE_COOKIE = "gcal_oauth_state";
const RETURN_COOKIE = "gcal_oauth_return";

// Whitelist of internal paths we'll honor in ?return_to=. Prevents the cookie
// from being abused as an open redirect.
const ALLOWED_RETURN_PATHS = ["/dashboard/settings", "/onboard/calendar", "/onboard/plan"];

export async function GET(req: NextRequest) {
  if (!env.GOOGLE_CALENDAR_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google Calendar OAuth is not configured." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.redirect(new URL("/auth/login", env.APP_URL));
  }
  const userId = data.claims.sub as string;

  // Sanity-check that this user owns a business — otherwise the callback
  // has nothing to attach tokens to.
  const [biz] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);
  if (!biz) {
    return NextResponse.redirect(new URL("/onboard", env.APP_URL));
  }

  const nonce = randomBytes(16).toString("hex");
  const redirectUri = new URL(
    "/api/integrations/google-calendar/callback",
    env.APP_URL,
  ).toString();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CALENDAR_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", nonce);

  const returnTo = new URL(req.url).searchParams.get("return_to");
  const safeReturnTo = ALLOWED_RETURN_PATHS.includes(returnTo ?? "")
    ? returnTo!
    : "/dashboard/settings";

  const res = NextResponse.redirect(authUrl);
  const cookieOpts = {
    httpOnly: true,
    secure: env.APP_URL.startsWith("https://"),
    sameSite: "lax" as const,
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  };
  res.cookies.set(STATE_COOKIE, nonce, cookieOpts);
  res.cookies.set(RETURN_COOKIE, safeReturnTo, cookieOpts);
  return res;
}
