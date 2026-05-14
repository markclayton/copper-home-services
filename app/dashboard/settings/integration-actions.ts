"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, events } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/db/queries";
import { decryptToken } from "@/lib/crypto/tokens";
import { revokeRefreshToken } from "@/lib/booking/google";

/**
 * Disconnect Google Calendar: revoke Google's refresh token and clear the
 * encrypted columns. Best-effort on the revoke — even if Google 4xxs (token
 * already revoked, network blip) we still wipe local state so the UI shows
 * "not connected".
 */
export async function disconnectGoogleCalendar(): Promise<void> {
  const { business } = await requireBusiness();

  if (business.calendarRefreshTokenEnc) {
    try {
      const refresh = decryptToken(business.calendarRefreshTokenEnc);
      await revokeRefreshToken(refresh);
    } catch (err) {
      // Logged but never blocks the disconnect — the user wants out.
      await db.insert(events).values({
        businessId: business.id,
        type: "integration.google_calendar.revoke_failed",
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  await db
    .update(businesses)
    .set({
      calendarProvider: null,
      calendarAccountEmail: null,
      calendarId: null,
      calendarRefreshTokenEnc: null,
      calendarAccessTokenEnc: null,
      calendarTokenExpiresAt: null,
      calendarConnectedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  await db.insert(events).values({
    businessId: business.id,
    type: "integration.google_calendar.disconnected",
    payload: {},
  });

  revalidatePath("/dashboard/settings");
}
