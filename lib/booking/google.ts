/**
 * Google Calendar booking layer — narrow surface for the AI receptionist.
 *
 * What we need from Google:
 *  - freeBusy lookup to know when the owner is busy
 *  - events.insert to create the appointment
 *  - token refresh (Google access tokens last 1hr; refresh tokens are durable)
 *  - token revoke at teardown
 *
 * Slot computation lives here too: we layer the owner's configured business
 * hours over the busy intervals to produce a flat list of bookable starts.
 *
 * Tokens are stored encrypted on the businesses row. loadOAuth() decrypts +
 * refreshes if expired, persists the new access token, then returns a ready-
 * to-use bearer token to callers.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, type Business } from "@/lib/db/schema";
import { requireEnv } from "@/lib/env";
import { decryptToken, encryptToken } from "@/lib/crypto/tokens";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const CAL_API = "https://www.googleapis.com/calendar/v3";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

type HoursDay = { open?: string; close?: string; closed?: boolean };
type HoursMap = Partial<Record<DayKey, HoursDay>>;

/** Refresh an access token using the stored refresh token. */
async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const clientId = requireEnv("GOOGLE_CALENDAR_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CALENDAR_CLIENT_SECRET");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000), // 60s skew
  };
}

/** Load a usable access token for the business, refreshing if expired. */
async function loadOAuth(business: Business): Promise<{
  accessToken: string;
  calendarId: string;
}> {
  if (
    business.calendarProvider !== "google" ||
    !business.calendarRefreshTokenEnc
  ) {
    throw new Error("Calendar not connected.");
  }
  const calendarId = business.calendarId ?? "primary";
  const expiresAt = business.calendarTokenExpiresAt;
  const stillValid =
    expiresAt &&
    business.calendarAccessTokenEnc &&
    expiresAt.getTime() > Date.now() + 30_000;

  if (stillValid && business.calendarAccessTokenEnc) {
    return {
      accessToken: decryptToken(business.calendarAccessTokenEnc),
      calendarId,
    };
  }

  const refreshToken = decryptToken(business.calendarRefreshTokenEnc);
  const refreshed = await refreshAccessToken(refreshToken);
  await db
    .update(businesses)
    .set({
      calendarAccessTokenEnc: encryptToken(refreshed.accessToken),
      calendarTokenExpiresAt: refreshed.expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  return { accessToken: refreshed.accessToken, calendarId };
}

type BusyInterval = { start: Date; end: Date };

async function fetchBusy(args: {
  accessToken: string;
  calendarId: string;
  timeMin: Date;
  timeMax: Date;
  timeZone: string;
}): Promise<BusyInterval[]> {
  const res = await fetch(`${CAL_API}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: args.timeMin.toISOString(),
      timeMax: args.timeMax.toISOString(),
      timeZone: args.timeZone,
      items: [{ id: args.calendarId }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google freeBusy failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as {
    calendars: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  const raw = data.calendars[args.calendarId]?.busy ?? [];
  return raw.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

/**
 * Given a YYYY-MM-DD date and HH:MM time, in a given IANA timezone, return
 * the absolute Date for that wall-clock moment.
 *
 * We can't just `new Date("2026-05-04T08:00:00")` — that uses the *server's*
 * timezone. We compute the UTC offset for the target zone on that date and
 * subtract it from the naive UTC parse.
 */
function wallClockInZone(
  date: string,
  time: string,
  timeZone: string,
): Date {
  // Format the target wall-clock string as if it were UTC, then ask Intl
  // what time the SAME instant reads as in the target zone. The difference
  // tells us how far off we are.
  const naive = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(naive);
  const m: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") m[p.type] = p.value;
  const asZonedUTC = Date.UTC(
    Number(m.year),
    Number(m.month) - 1,
    Number(m.day),
    Number(m.hour === "24" ? "0" : m.hour),
    Number(m.minute),
    Number(m.second),
  );
  const offset = asZonedUTC - naive.getTime();
  return new Date(naive.getTime() - offset);
}

function dayKeyForDate(date: string, timeZone: string): DayKey {
  // Compute weekday name in target zone for an ISO date string.
  const d = new Date(`${date}T12:00:00Z`); // noon UTC avoids DST edge
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(d);
  switch (weekday) {
    case "Sunday":
      return "sun";
    case "Monday":
      return "mon";
    case "Tuesday":
      return "tue";
    case "Wednesday":
      return "wed";
    case "Thursday":
      return "thu";
    case "Friday":
      return "fri";
    default:
      return "sat";
  }
}

function listDatesInRange(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  for (let d = s; d.getTime() <= e.getTime(); d = new Date(d.getTime() + 86_400_000)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export type FreeSlot = {
  /** ISO start time (UTC, suitable for booking). */
  startISO: string;
  /** ISO end time. */
  endISO: string;
};

/**
 * Compute available slots between two dates (inclusive) for a business with
 * a connected calendar. Slots are aligned on `slotStepMin` from the open
 * time, sized to `slotDurationMin`, and exclude anything overlapping a
 * busy interval on the connected calendar.
 */
export async function getFreeSlots(
  business: Business,
  args: {
    startDate: string; // YYYY-MM-DD
    endDate: string;
    slotDurationMin?: number;
    slotStepMin?: number;
    maxSlots?: number;
  },
): Promise<FreeSlot[]> {
  const slotDurationMin = args.slotDurationMin ?? 60;
  const slotStepMin = args.slotStepMin ?? 30;
  const maxSlots = args.maxSlots ?? 12;
  const tz = business.timezone;

  const oauth = await loadOAuth(business);

  const dates = listDatesInRange(args.startDate, args.endDate);
  if (dates.length === 0) return [];

  const rangeStart = wallClockInZone(dates[0], "00:00", tz);
  const rangeEnd = new Date(
    wallClockInZone(dates[dates.length - 1], "23:59", tz).getTime() + 60_000,
  );

  const busy = await fetchBusy({
    accessToken: oauth.accessToken,
    calendarId: oauth.calendarId,
    timeMin: rangeStart,
    timeMax: rangeEnd,
    timeZone: tz,
  });

  const hours = (business.hours ?? {}) as HoursMap;
  const slots: FreeSlot[] = [];
  const now = Date.now();

  for (const date of dates) {
    const dk = dayKeyForDate(date, tz);
    const day = hours[dk];
    if (!day || day.closed || !day.open || !day.close) continue;

    const dayStart = wallClockInZone(date, day.open, tz);
    const dayEnd = wallClockInZone(date, day.close, tz);
    const stepMs = slotStepMin * 60_000;
    const durationMs = slotDurationMin * 60_000;

    for (let t = dayStart.getTime(); t + durationMs <= dayEnd.getTime(); t += stepMs) {
      if (t < now + 60_000) continue; // skip past + give callers a minute
      const slotStart = t;
      const slotEnd = t + durationMs;
      const overlaps = busy.some(
        (b) => b.start.getTime() < slotEnd && b.end.getTime() > slotStart,
      );
      if (overlaps) continue;
      slots.push({
        startISO: new Date(slotStart).toISOString(),
        endISO: new Date(slotEnd).toISOString(),
      });
      if (slots.length >= maxSlots) return slots;
    }
  }

  return slots;
}

export type CreateBookingArgs = {
  startISO: string;
  endISO?: string; // defaults to startISO + 60min
  summary: string;
  description?: string;
  location?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
};

export type CreatedBooking = {
  id: string;
  htmlLink: string;
  startISO: string;
  endISO: string;
};

export async function createBooking(
  business: Business,
  args: CreateBookingArgs,
): Promise<CreatedBooking> {
  const oauth = await loadOAuth(business);
  const start = new Date(args.startISO);
  const end = args.endISO
    ? new Date(args.endISO)
    : new Date(start.getTime() + 60 * 60_000);

  // Only include attendees with real email addresses. Google rejects fake
  // domains like @no-email.local. The phone number lives in description.
  const realAttendee =
    args.attendeeEmail &&
    args.attendeeEmail.includes("@") &&
    !args.attendeeEmail.endsWith(".local")
      ? [{ email: args.attendeeEmail, displayName: args.attendeeName }]
      : undefined;

  const descLines = [
    args.description,
    args.attendeeName ? `Customer: ${args.attendeeName}` : null,
    args.attendeePhone ? `Phone: ${args.attendeePhone}` : null,
  ].filter(Boolean);

  const res = await fetch(
    `${CAL_API}/calendars/${encodeURIComponent(oauth.calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${oauth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: args.summary,
        description: descLines.join("\n"),
        location: args.location,
        start: { dateTime: start.toISOString(), timeZone: business.timezone },
        end: { dateTime: end.toISOString(), timeZone: business.timezone },
        attendees: realAttendee,
        reminders: { useDefault: true },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google events.insert failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as {
    id: string;
    htmlLink: string;
    start: { dateTime: string };
    end: { dateTime: string };
  };
  return {
    id: data.id,
    htmlLink: data.htmlLink,
    startISO: data.start.dateTime,
    endISO: data.end.dateTime,
  };
}

/**
 * Revoke a refresh token so Google severs ongoing access. Used at tenant
 * teardown. Best-effort: even if Google 4xxs (already-revoked, expired)
 * we still clear the DB columns.
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(refreshToken)}`, {
    method: "POST",
  });
}

/** Day-of-week helper to confirm DAY_KEYS export isn't dead — used by callers. */
export { DAY_KEYS };
