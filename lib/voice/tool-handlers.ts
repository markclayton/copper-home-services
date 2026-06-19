/**
 * Handlers for tools the Vapi assistant invokes mid-call.
 * Vapi sends a tool-calls message and BLOCKS waiting for a synchronous
 * response, so handlers must be fast and return a short string the assistant
 * can speak.
 */

import { createHash, randomInt } from "node:crypto";
import { and, asc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointmentChangeVerifications,
  appointments,
  calls,
  contacts,
  events,
  ownerMessages,
  type Business,
} from "@/lib/db/schema";
import { sendSms } from "@/lib/telephony/twilio";
import {
  createBooking,
  deleteBooking,
  getFreeSlots,
  updateBooking,
} from "@/lib/booking/google";
import { inngest } from "@/lib/jobs/client";
import { trackAppointmentBooked } from "@/lib/observability/events";
import type { VapiToolCall, VapiToolResult } from "./types";

export type ToolCtx = {
  business: Business;
  vapiCallId: string;
};

type ToolArgs = Record<string, unknown>;

const OTP_TTL_MS = 5 * 60_000;
const OTP_RESEND_COOLDOWN_MS = 60_000;
const OTP_MAX_ATTEMPTS = 5;

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

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateOtp(): string {
  // Inclusive 6-digit code; zero-padded so 4-digit numbers don't show short.
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${"X".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}

async function handleGetAvailableSlots(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  if (ctx.business.calendarProvider !== "google") {
    return "I can't see the schedule directly — let me take your info and have someone call you back to confirm a time.";
  }

  const startDate = String(args.start_date ?? "");
  const endDate = String(args.end_date ?? startDate);
  if (!startDate) return "I need a date to look up slots.";

  const slots = await getFreeSlots(ctx.business, {
    startDate,
    endDate,
    slotDurationMin: 60,
    slotStepMin: 30,
    maxSlots: 6,
  });

  if (slots.length === 0) {
    return `No openings between ${startDate} and ${endDate}. Try a wider window.`;
  }

  const formatted = slots
    .map((s) => {
      const friendly = formatBookingTime(new Date(s.startISO), ctx.business.timezone);
      return `${friendly} (start_at_iso=${s.startISO})`;
    })
    .join("; ");

  return `Available slots: ${formatted}. When the caller chooses one, pass its EXACT start_at_iso value to book_appointment — do NOT modify the ISO string.`;
}

async function handleBookAppointment(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  if (ctx.business.calendarProvider !== "google") {
    return "I can't book directly yet — let me take your info and have the owner call you back to confirm.";
  }

  const startISO = String(args.start_at_iso ?? "");
  const customerPhone = String(args.customer_phone ?? "");
  const customerName = String(args.customer_name ?? "");
  const serviceType = String(args.service_type ?? "service visit");
  const address = String(args.address ?? "");
  const notes = typeof args.notes === "string" ? args.notes : undefined;
  // A2P 10DLC compliance: SMS only fires when the AI captured an explicit
  // yes from the caller. Default to false (no SMS) for safety — better to
  // miss a confirmation text than to send one without consent.
  const smsConsent = args.sms_consent === true;

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

  // Only forward real emails to Google — fake addresses get rejected when
  // listed as attendees. The phone number lives in the description.
  const customerEmail =
    typeof args.customer_email === "string" && args.customer_email.includes("@")
      ? args.customer_email
      : undefined;

  const booking = await createBooking(ctx.business, {
    startISO,
    summary: `${serviceType} — ${customerName}`,
    description: notes,
    location: address || undefined,
    attendeeName: customerName,
    attendeeEmail: customerEmail,
    attendeePhone: customerPhone,
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
      calEventId: booking.id,
      startAt: new Date(booking.startISO),
      endAt: new Date(booking.endISO),
      serviceType,
      notes: [address, notes].filter(Boolean).join("\n"),
      status: "scheduled",
      smsConsent,
    })
    .returning({ id: appointments.id });

  await inngest.send({
    name: "appointment/booked",
    data: {
      businessId: ctx.business.id,
      appointmentId: appt.id,
      contactId,
      endAt: new Date(booking.endISO).toISOString(),
    },
  });

  await trackAppointmentBooked({
    userId: ctx.business.ownerUserId,
    businessId: ctx.business.id,
    appointmentId: appt.id,
    serviceType,
    source: "ai",
  });

  const friendlyTime = formatBookingTime(
    new Date(booking.startISO),
    ctx.business.timezone,
  );

  // Customer confirmation only fires when the AI captured explicit SMS
  // consent. Owner notification is fanned out by notifyOwnerAppointmentBooked
  // which listens for the appointment/booked event fired above — that one's
  // owner-facing and not gated by customer consent.
  if (smsConsent) {
    await sendSms({
      businessId: ctx.business.id,
      contactId,
      to: customerPhone,
      body: `Confirmed — ${serviceType} on ${friendlyTime}. ${ctx.business.name} will text before arrival. Reply with questions.`,
    }).catch(() => {
      // Customer SMS failure shouldn't fail the booking; the Inngest owner
      // notification will still fire so the owner sees the booking.
    });
    return `Booked ${serviceType} for ${friendlyTime}. Confirmation text sent.`;
  }

  await recordEvent(ctx.business.id, "appointment.sms_skipped_no_consent", {
    appointmentId: appt.id,
    serviceType,
    startAt: booking.startISO,
  });
  return `Booked ${serviceType} for ${friendlyTime}. No text will be sent — caller declined.`;
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

  await inngest.send({
    name: "emergency/detected",
    data: {
      businessId: ctx.business.id,
      summary,
      customerPhone,
      address,
      vapiCallId: ctx.vapiCallId,
    },
  });

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

async function handleTakeMessage(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  const message = String(args.message ?? "").trim();
  if (!message) return "I need the message body before I can pass this along.";

  const callerPhone =
    typeof args.caller_phone === "string" ? args.caller_phone : null;
  const callerName =
    typeof args.caller_name === "string" ? args.caller_name : null;
  const subject = typeof args.subject === "string" ? args.subject : null;

  const callId = await ensureCallRow(ctx.business.id, ctx.vapiCallId);
  const contactId = await ensureContact(ctx.business.id, callerPhone, callerName);

  const [row] = await db
    .insert(ownerMessages)
    .values({
      businessId: ctx.business.id,
      callId,
      contactId,
      callerName,
      callerPhone,
      subject,
      message,
    })
    .returning({ id: ownerMessages.id });

  await inngest.send({
    name: "message/taken",
    data: {
      businessId: ctx.business.id,
      ownerMessageId: row.id,
      vapiCallId: ctx.vapiCallId,
    },
  });

  return "Message saved. The owner will see it as soon as they're free.";
}

/**
 * Find upcoming scheduled appointments for the caller's phone number.
 * Returns the appointment id (the assistant carries this through the rest
 * of the OTP flow) plus the human-friendly date/service so the model can
 * confirm with the caller before sending a code.
 */
async function handleLookupAppointmentForChange(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  const phone = typeof args.phone === "string" ? args.phone.trim() : "";
  if (!phone) return "I need the phone number to look up your appointment.";

  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(eq(contacts.businessId, ctx.business.id), eq(contacts.phone, phone)),
    )
    .limit(1);
  if (!contact) {
    return `I don't see anything on file for ${phone}. Are you sure that's the number we booked under?`;
  }

  const now = new Date();
  const rows = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      serviceType: appointments.serviceType,
      status: appointments.status,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, ctx.business.id),
        eq(appointments.contactId, contact.id),
        eq(appointments.status, "scheduled"),
        gte(appointments.startAt, now),
      ),
    )
    .orderBy(asc(appointments.startAt))
    .limit(5);

  if (rows.length === 0) {
    return "I don't see any upcoming appointments under that number.";
  }

  const list = rows
    .map((r) => {
      const when = formatBookingTime(r.startAt, ctx.business.timezone);
      return `${r.serviceType ?? "Service visit"} on ${when} (appointment_id=${r.id})`;
    })
    .join("; ");
  return `Found ${rows.length} upcoming appointment(s): ${list}. Confirm which one with the caller before sending an OTP.`;
}

async function handleSendAppointmentChangeOtp(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  const appointmentId =
    typeof args.appointment_id === "string" ? args.appointment_id : "";
  if (!appointmentId) {
    return "I need the appointment_id from lookup_appointment_for_change first.";
  }

  const [appt] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      contactId: appointments.contactId,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.businessId, ctx.business.id),
      ),
    )
    .limit(1);
  if (!appt) return "That appointment isn't on our calendar.";
  if (appt.status !== "scheduled")
    return `That appointment is already ${appt.status}. Nothing to change.`;

  if (!appt.contactId) {
    return "There's no phone number on file for that appointment, so I can't text a verification code. I'll need to take a message for the owner instead.";
  }
  const [contact] = await db
    .select({ phone: contacts.phone })
    .from(contacts)
    .where(eq(contacts.id, appt.contactId))
    .limit(1);
  if (!contact?.phone) {
    return "There's no phone number on file for that appointment, so I can't text a verification code. I'll need to take a message for the owner instead.";
  }

  // Resend cooldown: if a fresh, unconsumed code already exists for this
  // appointment, refuse to spam another text.
  const cooldownSince = new Date(Date.now() - OTP_RESEND_COOLDOWN_MS);
  const [recent] = await db
    .select({ id: appointmentChangeVerifications.id })
    .from(appointmentChangeVerifications)
    .where(
      and(
        eq(appointmentChangeVerifications.appointmentId, appointmentId),
        gte(appointmentChangeVerifications.createdAt, cooldownSince),
        isNull(appointmentChangeVerifications.consumedAt),
      ),
    )
    .limit(1);
  if (recent) {
    return `I just sent a code to ${maskPhone(contact.phone)}. Ask the caller to read what they received — if it didn't arrive, wait a minute and we'll try again.`;
  }

  const code = generateOtp();
  await db.insert(appointmentChangeVerifications).values({
    businessId: ctx.business.id,
    appointmentId,
    contactPhone: contact.phone,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    vapiCallId: ctx.vapiCallId,
  });

  try {
    // Bypass the per-tenant SMS quota: this is operational/security traffic,
    // not marketing. A2P 10DLC categorizes OTPs as transactional.
    await sendSms({
      businessId: ctx.business.id,
      contactId: appt.contactId,
      to: contact.phone,
      body: `${ctx.business.name}: your verification code is ${code}. It expires in 5 minutes. We will never call asking for this code.`,
      bypassQuota: true,
    });
  } catch (err) {
    await recordEvent(ctx.business.id, "tool.otp.send_failed", {
      appointmentId,
      message: err instanceof Error ? err.message : String(err),
    });
    return "I couldn't send the verification text just now. Let me take a message instead so the owner can reach out.";
  }

  return `Code sent to ${maskPhone(contact.phone)}. Ask the caller to read back the 6-digit code, then pass it to verify_appointment_change_otp.`;
}

async function handleVerifyAppointmentChangeOtp(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  const appointmentId =
    typeof args.appointment_id === "string" ? args.appointment_id : "";
  const code = typeof args.code === "string" ? args.code.replace(/\D/g, "") : "";
  if (!appointmentId || !code) return "I need both the appointment_id and the code.";

  // Newest unconsumed verification for this appointment.
  const [row] = await db
    .select()
    .from(appointmentChangeVerifications)
    .where(
      and(
        eq(appointmentChangeVerifications.appointmentId, appointmentId),
        eq(appointmentChangeVerifications.businessId, ctx.business.id),
        isNull(appointmentChangeVerifications.consumedAt),
      ),
    )
    .orderBy(asc(appointmentChangeVerifications.createdAt))
    .limit(1);

  if (!row) {
    return "No active verification for that appointment. Use send_appointment_change_otp to start one.";
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db
      .update(appointmentChangeVerifications)
      .set({ consumedAt: new Date() })
      .where(eq(appointmentChangeVerifications.id, row.id));
    return "That code expired. Send a fresh one.";
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await db
      .update(appointmentChangeVerifications)
      .set({ consumedAt: new Date() })
      .where(eq(appointmentChangeVerifications.id, row.id));
    return "Too many wrong attempts on that code. Send a new one and ask the caller to read carefully.";
  }

  const matches = row.codeHash === hashCode(code);
  if (!matches) {
    await db
      .update(appointmentChangeVerifications)
      .set({ attempts: row.attempts + 1 })
      .where(eq(appointmentChangeVerifications.id, row.id));
    const remaining = OTP_MAX_ATTEMPTS - (row.attempts + 1);
    return `Code didn't match. ${remaining} attempt(s) left — ask the caller to read it again.`;
  }

  await db
    .update(appointmentChangeVerifications)
    .set({ verifiedAt: new Date() })
    .where(eq(appointmentChangeVerifications.id, row.id));

  return "Code verified. You can now call cancel_appointment or reschedule_appointment for this appointment in this call.";
}

/**
 * Look up an unconsumed, verified OTP row scoped to the current Vapi call.
 * Returns the row if the gate is open; null otherwise.
 */
async function findVerifiedChange(
  ctx: ToolCtx,
  appointmentId: string,
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({
      id: appointmentChangeVerifications.id,
      vapiCallId: appointmentChangeVerifications.vapiCallId,
    })
    .from(appointmentChangeVerifications)
    .where(
      and(
        eq(appointmentChangeVerifications.appointmentId, appointmentId),
        eq(appointmentChangeVerifications.businessId, ctx.business.id),
        isNull(appointmentChangeVerifications.consumedAt),
      ),
    )
    .orderBy(asc(appointmentChangeVerifications.createdAt))
    .limit(1);
  if (!row) return null;
  // Pull the verified flag in a second select to keep the WHERE narrow.
  const [full] = await db
    .select()
    .from(appointmentChangeVerifications)
    .where(eq(appointmentChangeVerifications.id, row.id))
    .limit(1);
  if (!full?.verifiedAt) return null;
  if (full.vapiCallId !== ctx.vapiCallId) return null;
  return { id: full.id };
}

async function consumeVerification(verificationId: string) {
  await db
    .update(appointmentChangeVerifications)
    .set({ consumedAt: new Date() })
    .where(eq(appointmentChangeVerifications.id, verificationId));
}

async function handleCancelAppointment(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  const appointmentId =
    typeof args.appointment_id === "string" ? args.appointment_id : "";
  if (!appointmentId) return "I need an appointment_id.";

  const verified = await findVerifiedChange(ctx, appointmentId);
  if (!verified) {
    return "I can't cancel without a verified OTP for this appointment. Run verify_appointment_change_otp first.";
  }

  const [appt] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.businessId, ctx.business.id),
      ),
    )
    .limit(1);
  if (!appt) return "That appointment isn't on our calendar.";
  if (appt.status === "cancelled") {
    await consumeVerification(verified.id);
    return "That appointment was already cancelled.";
  }

  if (appt.calEventId) {
    try {
      await deleteBooking(ctx.business, appt.calEventId);
    } catch (err) {
      await recordEvent(ctx.business.id, "tool.cancel.calendar_failed", {
        appointmentId,
        message: err instanceof Error ? err.message : String(err),
      });
      // Continue — we'd rather mark cancelled in our DB than tell the caller
      // it failed when only the Google sync did. The owner can clean up the
      // dangling calendar event from the failure event log.
    }
  }

  await db
    .update(appointments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(appointments.id, appointmentId));

  await consumeVerification(verified.id);

  await inngest.send({
    name: "appointment/cancelled",
    data: {
      businessId: ctx.business.id,
      appointmentId,
      vapiCallId: ctx.vapiCallId,
      reason: "caller_cancelled",
    },
  });

  const friendly = formatBookingTime(appt.startAt, ctx.business.timezone);
  return `Cancelled ${appt.serviceType ?? "your appointment"} on ${friendly}.`;
}

async function handleRescheduleAppointment(
  ctx: ToolCtx,
  args: ToolArgs,
): Promise<string> {
  const appointmentId =
    typeof args.appointment_id === "string" ? args.appointment_id : "";
  const newStartISO =
    typeof args.new_start_at_iso === "string" ? args.new_start_at_iso : "";
  if (!appointmentId || !newStartISO) {
    return "I need both appointment_id and new_start_at_iso.";
  }

  const newStart = new Date(newStartISO);
  if (Number.isNaN(newStart.getTime())) {
    return "That new start time isn't a valid ISO date.";
  }
  if (newStart.getTime() < Date.now() + 5 * 60_000) {
    return "Pick a time at least a few minutes out from now.";
  }

  const verified = await findVerifiedChange(ctx, appointmentId);
  if (!verified) {
    return "I can't reschedule without a verified OTP for this appointment. Run verify_appointment_change_otp first.";
  }

  const [appt] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.businessId, ctx.business.id),
      ),
    )
    .limit(1);
  if (!appt) return "That appointment isn't on our calendar.";
  if (appt.status !== "scheduled") {
    return `That appointment is ${appt.status}. I can't move a ${appt.status} booking — book a fresh one instead.`;
  }

  const durationMs = appt.endAt.getTime() - appt.startAt.getTime();
  const newEnd = new Date(newStart.getTime() + durationMs);

  if (!appt.calEventId) {
    return "I can't sync that change to the calendar — let me take a message so the owner can reschedule manually.";
  }

  try {
    const patched = await updateBooking(ctx.business, appt.calEventId, {
      startISO: newStart.toISOString(),
      endISO: newEnd.toISOString(),
    });
    await db
      .update(appointments)
      .set({
        startAt: new Date(patched.startISO),
        endAt: new Date(patched.endISO),
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));
  } catch (err) {
    await recordEvent(ctx.business.id, "tool.reschedule.calendar_failed", {
      appointmentId,
      message: err instanceof Error ? err.message : String(err),
    });
    return "The calendar wouldn't accept that change. Let me take a message and have the owner sort it out.";
  }

  await consumeVerification(verified.id);

  await inngest.send({
    name: "appointment/rescheduled",
    data: {
      businessId: ctx.business.id,
      appointmentId,
      vapiCallId: ctx.vapiCallId,
      oldStartAt: appt.startAt.toISOString(),
      newStartAt: newStart.toISOString(),
    },
  });

  const friendly = formatBookingTime(newStart, ctx.business.timezone);
  return `Moved ${appt.serviceType ?? "the appointment"} to ${friendly}.`;
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
      case "take_message":
        result = await handleTakeMessage(ctx, args);
        break;
      case "lookup_appointment_for_change":
        result = await handleLookupAppointmentForChange(ctx, args);
        break;
      case "send_appointment_change_otp":
        result = await handleSendAppointmentChangeOtp(ctx, args);
        break;
      case "verify_appointment_change_otp":
        result = await handleVerifyAppointmentChangeOtp(ctx, args);
        break;
      case "cancel_appointment":
        result = await handleCancelAppointment(ctx, args);
        break;
      case "reschedule_appointment":
        result = await handleRescheduleAppointment(ctx, args);
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
