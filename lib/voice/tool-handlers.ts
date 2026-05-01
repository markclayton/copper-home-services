/**
 * Handlers for tools the Vapi assistant invokes mid-call.
 * Vapi sends a tool-calls message and BLOCKS waiting for a synchronous
 * response, so handlers must be fast and return a short string the assistant
 * can speak.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  calls,
  contacts,
  events,
  type Business,
} from "@/lib/db/schema";
import { sendSms } from "@/lib/telephony/twilio";
import { createBooking, listAvailableSlots } from "@/lib/booking/cal";
import { inngest } from "@/lib/jobs/client";
import type { VapiToolCall, VapiToolResult } from "./types";

export type ToolCtx = {
  business: Business;
  vapiCallId: string;
};

type ToolArgs = Record<string, unknown>;

function parseArgs(toolCall: VapiToolCall): ToolArgs {
  const raw = toolCall.function.arguments;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ToolArgs;
    } catch {
      return {};
    }
  }
  return raw ?? {};
}

async function recordEvent(
  businessId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  await db.insert(events).values({ businessId, type, payload });
}

async function ensureCallRow(
  businessId: string,
  vapiCallId: string,
): Promise<string> {
  const [existing] = await db
    .select({ id: calls.id })
    .from(calls)
    .where(eq(calls.vapiCallId, vapiCallId))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(calls)
    .values({
      businessId,
      vapiCallId,
      direction: "inbound",
      status: "in_progress",
    })
    .returning({ id: calls.id });

  return created.id;
}

async function ensureContact(
  businessId: string,
  phone: string | undefined | null,
  name: string | undefined | null,
): Promise<string | null> {
  if (!phone) return null;
  const [existing] = await db
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .where(and(eq(contacts.businessId, businessId), eq(contacts.phone, phone)))
    .limit(1);

  if (existing) {
    await db
      .update(contacts)
      .set({
        lastSeenAt: new Date(),
        ...(name && !existing.name ? { name } : {}),
      })
      .where(eq(contacts.id, existing.id));
    return existing.id;
  }

  const [created] = await db
    .insert(contacts)
    .values({
      businessId,
      phone,
      name: name ?? null,
      source: "call",
    })
    .returning({ id: contacts.id });

  return created.id;
}

function formatBookingTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function digits(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

async function handleGetAvailableSlots(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  const eventTypeId = ctx.business.calComEventTypeId;
  if (!eventTypeId) {
    return "Booking is not yet configured for this business.";
  }

  const startDate = String(args.start_date ?? "");
  const endDate = String(args.end_date ?? startDate);
  if (!startDate) return "I need a date to look up slots.";

  const slots = await listAvailableSlots({
    eventTypeId: Number(eventTypeId),
    startDate,
    endDate,
    timeZone: ctx.business.timezone,
  });

  if (slots.length === 0) {
    return `No openings between ${startDate} and ${endDate}. Try a wider window.`;
  }

  const formatted = slots
    .slice(0, 6)
    .map((s) => {
      const friendly = formatBookingTime(new Date(s.time), ctx.business.timezone);
      return `${friendly} (start_at_iso=${s.time})`;
    })
    .join("; ");

  return `Available slots: ${formatted}. When the caller chooses one, pass its EXACT start_at_iso value to book_appointment — do NOT modify the ISO string.`;
}

async function handleBookAppointment(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  const eventTypeId = ctx.business.calComEventTypeId;
  if (!eventTypeId) return "Booking is not yet configured for this business.";

  const startISO = String(args.start_at_iso ?? "");
  const customerPhone = String(args.customer_phone ?? "");
  const customerName = String(args.customer_name ?? "");
  const serviceType = String(args.service_type ?? "service visit");
  const address = String(args.address ?? "");
  const notes = typeof args.notes === "string" ? args.notes : undefined;

  if (!startISO || !customerPhone || !customerName) {
    return "Missing required fields. I need start_at_iso, customer_phone, and customer_name.";
  }

  // Idempotency: if this call already produced a booking, don't create another one.
  const callRowId = await ensureCallRow(ctx.business.id, ctx.vapiCallId);
  const [existing] = await db
    .select({ id: appointments.id, startAt: appointments.startAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, ctx.business.id),
        eq(appointments.callId, callRowId),
      ),
    )
    .limit(1);
  if (existing) {
    const friendly = formatBookingTime(existing.startAt, ctx.business.timezone);
    return `Already booked ${serviceType} for ${friendly}. Confirmation text already sent.`;
  }

  const email =
    typeof args.customer_email === "string" && args.customer_email.includes("@")
      ? args.customer_email
      : `${digits(customerPhone) || "unknown"}@no-email.local`;

  const booking = await createBooking({
    eventTypeId: Number(eventTypeId),
    startISO,
    attendeeName: customerName,
    attendeeEmail: email,
    attendeePhone: customerPhone,
    timeZone: ctx.business.timezone,
    notes: notes ?? `${serviceType} — ${address}`.trim(),
  });

  const callId = callRowId;
  const contactId = await ensureContact(
    ctx.business.id,
    customerPhone,
    customerName,
  );

  const [appt] = await db
    .insert(appointments)
    .values({
      businessId: ctx.business.id,
      contactId,
      callId,
      calEventId: String(booking.id),
      startAt: new Date(booking.start),
      endAt: new Date(booking.end),
      serviceType,
      notes: [address, notes].filter(Boolean).join("\n"),
      status: "scheduled",
    })
    .returning({ id: appointments.id });

  await inngest.send({
    name: "appointment/booked",
    data: {
      businessId: ctx.business.id,
      appointmentId: appt.id,
      contactId,
      endAt: new Date(booking.end).toISOString(),
    },
  });

  const friendlyTime = formatBookingTime(
    new Date(booking.start),
    ctx.business.timezone,
  );

  await Promise.allSettled([
    sendSms({
      businessId: ctx.business.id,
      contactId,
      to: customerPhone,
      body: `Confirmed — ${serviceType} on ${friendlyTime}. ${ctx.business.name} will text before arrival. Reply with questions.`,
    }),
    sendSms({
      businessId: ctx.business.id,
      to: ctx.business.ownerPhone,
      body: `New booking: ${customerName} • ${serviceType} • ${friendlyTime} • ${customerPhone}`,
    }),
  ]);

  return `Booked ${serviceType} for ${friendlyTime}. Confirmation text sent.`;
}

async function handleLookupCustomer(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  const phone = typeof args.phone === "string" ? args.phone : null;
  if (!phone) return "No phone number provided.";

  const [match] = await db
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .where(
      and(eq(contacts.businessId, ctx.business.id), eq(contacts.phone, phone)),
    )
    .limit(1);

  if (!match) return `No existing customer found for ${phone}.`;
  return `Existing customer: ${match.name ?? "(name on file unset)"}.`;
}

async function handleEmergencyAlert(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  const summary = String(args.summary ?? "Emergency reported.");
  const customerPhone = String(args.customer_phone ?? "");
  const address =
    typeof args.address === "string" ? args.address : "(no address provided)";

  await recordEvent(ctx.business.id, "tool.emergency_alert.sent", {
    summary,
    customerPhone,
    address,
  });

  try {
    await sendSms({
      businessId: ctx.business.id,
      to: ctx.business.ownerPhone,
      body: `EMERGENCY @ ${ctx.business.name}: ${summary}. Caller ${customerPhone}. Address: ${address}.`,
    });
  } catch (err) {
    await recordEvent(ctx.business.id, "tool.emergency_alert.sms_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return "Emergency logged. The owner has been alerted and will call back within minutes.";
}

async function handleQuoteFollowup(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  await recordEvent(ctx.business.id, "tool.quote_followup.requested", args);

  await inngest.send({
    name: "tool/quote-followup",
    data: {
      businessId: ctx.business.id,
      details: String(args.details ?? "(no details)"),
      customerPhone: String(args.customer_phone ?? ""),
      customerName:
        typeof args.customer_name === "string" ? args.customer_name : undefined,
      vapiCallId: ctx.vapiCallId,
    },
  });

  return "Quote request received. Someone will call you back with pricing today.";
}

export async function handleToolCall(
  ctx: ToolCtx,
  toolCall: VapiToolCall,
): Promise<VapiToolResult> {
  const args = parseArgs(toolCall);
  const name = toolCall.function.name;

  let result: string;
  try {
    switch (name) {
      case "get_available_slots":
        result = await handleGetAvailableSlots(ctx, args);
        break;
      case "book_appointment":
        result = await handleBookAppointment(ctx, args);
        break;
      case "lookup_existing_customer":
        result = await handleLookupCustomer(ctx, args);
        break;
      case "send_emergency_alert":
        result = await handleEmergencyAlert(ctx, args);
        break;
      case "send_quote_followup":
        result = await handleQuoteFollowup(ctx, args);
        break;
      default:
        result = `Unknown tool: ${name}`;
    }
  } catch (err) {
    await recordEvent(ctx.business.id, "tool.error", {
      name,
      args,
      message: err instanceof Error ? err.message : String(err),
    });
    result =
      "There was a temporary issue completing that action. Please try again or I can have someone call you back.";
  }

  return { toolCallId: toolCall.id, result };
}
