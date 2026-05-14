/**
 * Handles the Google OAuth redirect. Validates state, exchanges the auth
 * code for tokens, stores the encrypted refresh token + cached access token
 * on the business row, then sends the user back to settings.
 *
 * Notable failure modes:
 *  - state mismatch (CSRF) → 400, no DB write
 *  - user denied consent → redirect back to settings with ?error=denied
 *  - missing refresh_token (user previously consented without consent prompt
 *    → access token only) → redirect with ?error=no_refresh_token so the UI
 *    can ask them to revoke + reconnect
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { businesses, events } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { encryptToken } from "@/lib/crypto/tokens";

const STATE_COOKIE = "gcal_oauth_state";
const RETURN_COOKIE = "gcal_oauth_return";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function buildRedirect(req: NextRequest, error?: string): NextResponse {
  const returnPath = req.cookies.get(RETURN_COOKIE)?.value ?? "/dashboard/settings";
  const url = new URL(returnPath, env.APP_URL);
  if (error) url.searchParams.set("gcal_error", error);
  else url.searchParams.set("gcal_connected", "1");
  const res = NextResponse.redirect(url);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(RETURN_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) return buildRedirect(req, errorParam);
  if (!code || !stateParam) return buildRedirect(req, "missing_params");

  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;
  if (!stateCookie || stateCookie !== stateParam) {
    return buildRedirect(req, "state_mismatch");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.redirect(new URL("/auth/login", env.APP_URL));
  }
  const userId = data.claims.sub as string;

  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);
  if (!biz) return buildRedirect(req, "no_business");

  if (!env.GOOGLE_CALENDAR_CLIENT_ID || !env.GOOGLE_CALENDAR_CLIENT_SECRET) {
    return buildRedirect(req, "not_configured");
  }

  const redirectUri = new URL(
    "/api/integrations/google-calendar/callback",
    env.APP_URL,
  ).toString();

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    await db
      .insert(events)
      .values({
        businessId: biz.id,
        type: "integration.google_calendar.token_exchange_failed",
        payload: { status: tokenRes.status, body: text.slice(0, 500) },
      });
    return buildRedirect(req, "token_exchange_failed");
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  if (!tokens.refresh_token) {
    // Google only returns refresh_token on first consent. If the user
    // previously granted access and we lost their token, they need to
    // revoke at myaccount.google.com first. The UI surfaces this.
    return buildRedirect(req, "no_refresh_token");
  }

  // Fetch the connected account's email so we can show it in the dashboard.
  let accountEmail: string | null = null;
  try {
    const userinfoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (userinfoRes.ok) {
      const userinfo = (await userinfoRes.json()) as { email?: string };
      accountEmail = userinfo.email ?? null;
    }
  } catch {
    // Non-fatal — we just won't show the email in the UI.
  }

  await db
    .update(businesses)
    .set({
      calendarProvider: "google",
      calendarAccountEmail: accountEmail,
      calendarId: "primary",
      calendarRefreshTokenEnc: encryptToken(tokens.refresh_token),
      calendarAccessTokenEnc: encryptToken(tokens.access_token),
      calendarTokenExpiresAt: new Date(
        Date.now() + (tokens.expires_in - 60) * 1000,
      ),
      calendarConnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, biz.id));

  await db.insert(events).values({
    businessId: biz.id,
    type: "integration.google_calendar.connected",
    payload: { accountEmail },
  });

  return buildRedirect(req);
}
