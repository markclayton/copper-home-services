/**
 * Smoke-test the Google Calendar integration end-to-end against a real
 * connected business. Exercises:
 *   1. Token decrypt + refresh (loadOAuth)
 *   2. freeBusy query + business-hours slot computation (getFreeSlots)
 *   3. events.insert (createBooking) — only when --book is passed
 *
 * Useful for verifying the booking layer without going through the full
 * Vapi → tool-handlers path.
 *
 * Run:
 *   bun scripts/test-calendar.ts                  # slots only, auto-detect business
 *   bun scripts/test-calendar.ts <business_id>    # slots for a specific business
 *   bun scripts/test-calendar.ts --book           # also create a test event
 *
 * The test event is titled "Copper test booking — DELETE ME" so it's easy
 * to clean up afterwards.
 */

import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { createBooking, getFreeSlots } from "@/lib/booking/google";

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let book = false;
  for (const arg of argv) {
    if (arg === "--book") book = true;
    else positional.push(arg);
  }
  return { businessId: positional[0], book };
}

function fmt(dateISO: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateISO));
}

function todayInZone(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA gives YYYY-MM-DD
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const { businessId: argId, book } = parseArgs(process.argv.slice(2));

  // Find the business: explicit id, or any business with a Google calendar
  // connected. If multiple are connected, prefer the most recently linked.
  let business;
  if (argId) {
    [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, argId))
      .limit(1);
    if (!business) {
      console.error(`No business with id ${argId}`);
      process.exit(1);
    }
  } else {
    const connected = await db
      .select()
      .from(businesses)
      .where(isNotNull(businesses.calendarRefreshTokenEnc))
      .limit(5);
    if (connected.length === 0) {
      console.error(
        "No business has a connected calendar. Connect one from /dashboard/settings → Integrations first.",
      );
      process.exit(1);
    }
    if (connected.length > 1) {
      console.error(
        `Multiple businesses have calendars connected. Pass one explicitly:\n${connected
          .map((b) => `  bun scripts/test-calendar.ts ${b.id}  # ${b.name}`)
          .join("\n")}`,
      );
      process.exit(1);
    }
    business = connected[0];
  }

  if (business.calendarProvider !== "google") {
    console.error(
      `Business ${business.id} (${business.name}) has no Google Calendar connected.`,
    );
    process.exit(1);
  }

  console.log("Business:");
  console.log(`  id:        ${business.id}`);
  console.log(`  name:      ${business.name}`);
  console.log(`  timezone:  ${business.timezone}`);
  console.log(`  calendar:  ${business.calendarAccountEmail ?? "(unknown)"}`);
  console.log(`  connected: ${business.calendarConnectedAt?.toISOString() ?? "(unknown)"}`);
  console.log(`  hours:     ${business.hours ? "configured" : "MISSING — slot computation will return nothing"}`);
  console.log("");

  // Look 3 days ahead in the business's timezone.
  const startDate = todayInZone(business.timezone);
  const endDate = addDays(startDate, 3);

  console.log(`Checking slots ${startDate} → ${endDate} (business tz: ${business.timezone})...`);
  const slots = await getFreeSlots(business, {
    startDate,
    endDate,
    slotDurationMin: 60,
    slotStepMin: 30,
    maxSlots: 12,
  });

  if (slots.length === 0) {
    console.log("  (no slots returned)");
    console.log("  Reasons this might be empty:");
    console.log("    - business.hours is null or every day is marked closed");
    console.log("    - the calendar is fully booked for the next 3 days");
    console.log("    - all slots fall in the past (the script filters those)");
  } else {
    for (const s of slots) {
      console.log(`  • ${fmt(s.startISO, business.timezone)}  (${s.startISO} → ${s.endISO})`);
    }
  }
  console.log("");

  if (!book) {
    console.log("Slot lookup OK. Re-run with --book to create a test event.");
    return;
  }

  if (slots.length === 0) {
    console.error("Cannot --book without any available slots.");
    process.exit(1);
  }

  const chosen = slots[0];
  console.log(`Creating test event at ${fmt(chosen.startISO, business.timezone)}...`);
  const booking = await createBooking(business, {
    startISO: chosen.startISO,
    endISO: chosen.endISO,
    summary: "Copper test booking — DELETE ME",
    description: "Created by scripts/test-calendar.ts to verify the integration end-to-end. Safe to delete.",
    location: "123 Test Street",
    attendeeName: "Test Customer",
    attendeePhone: "+15555550100",
  });

  console.log("✓ Event created.");
  console.log(`  id:    ${booking.id}`);
  console.log(`  link:  ${booking.htmlLink}`);
  console.log(`  time:  ${fmt(booking.startISO, business.timezone)} → ${fmt(booking.endISO, business.timezone)}`);
  console.log("");
  console.log("Check the connected Google Calendar — the event should appear within a few seconds.");
  console.log("Delete it from Google Calendar when you're done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
