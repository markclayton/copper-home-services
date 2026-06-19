import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  businesses,
  callTranscriptSegments,
  calls,
  contacts,
  events,
  type Business,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { summarizeCall } from "@/lib/ai/llm";
import { handleToolCall, type ToolCtx } from "@/lib/voice/tool-handlers";
import { inngest } from "@/lib/jobs/client";
import { getMinuteCap, type PlanTier } from "@/lib/billing/plans";
import {
  crossedThreshold,
  getMinutesUsedThisCycle,
} from "@/lib/billing/usage";
import { sendSms } from "@/lib/telephony/twilio";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";
import { renderUsageAlert } from "@/lib/notifications/templates";
import {
  trackCallCompleted,
  trackUsageWarningFired,
} from "@/lib/observability/events";
import type {
  VapiEndOfCallReport,
  VapiServerPayload,
  VapiStatusUpdate,
  VapiToolCallsMessage,
  VapiToolResponse,
  VapiTranscriptStreamMessage,
} from "@/lib/voice/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ business_id: string }> },
) {
  const { business_id: businessId } = await params;

  if (!UUID_RE.test(businessId)) {
    return NextResponse.json({ error: "invalid business id" }, { status: 400 });
  }

  const expectedSecret = env.VAPI_WEBHOOK_SECRET;
  if (expectedSecret) {
    const provided = req.headers.get("x-vapi-secret");
    if (provided !== expectedSecret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Belt-and-suspenders — env guard should have caught this already.
    return NextResponse.json(
      { error: "server misconfigured: VAPI_WEBHOOK_SECRET not set" },
      { status: 500 },
    );
  }

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  let payload: VapiServerPayload;
  try {
    payload = (await req.json()) as VapiServerPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const message = payload.message;
  if (!message) {
    return NextResponse.json({ error: "missing message" }, { status: 400 });
  }

  switch (message.type) {
    case "tool-calls":
      return handleToolCallsMessage(business, message);
    case "end-of-call-report":
      await handleEndOfCallReport(business, message);
      return NextResponse.json({ ok: true });
    case "status-update":
      await handleStatusUpdate(business, message);
      return NextResponse.json({ ok: true });
    case "transcript":
      await handleTranscriptStream(business, message);
      return NextResponse.json({ ok: true });
    case "conversation-update":
    case "speech-update":
    case "model-output":
    case "hang":
      // Streaming mid-call updates we don't act on. Ack and drop.
      return NextResponse.json({ ok: true });
    default:
      await db.insert(events).values({
        businessId,
        type: "vapi.unhandled",
        payload: message as unknown as Record<string, unknown>,
      });
      return NextResponse.json({ ok: true });
  }
}

async function handleToolCallsMessage(
  business: Business,
  message: VapiToolCallsMessage,
): Promise<NextResponse<VapiToolResponse>> {
  const ctx: ToolCtx = {
    business,
    vapiCallId: message.call.id,
  };
  const results = await Promise.all(
    message.toolCallList.map((tc) => handleToolCall(ctx, tc)),
  );
  return NextResponse.json({ results });
}

async function handleStatusUpdate(
  business: Business,
  message: VapiStatusUpdate,
) {
  await db.insert(events).values({
    businessId: business.id,
    type: `vapi.status-update.${message.status}`,
    payload: message as unknown as Record<string, unknown>,
  });
}

/**
 * Live transcript stream. Vapi emits partials with the same role until a
 * final lands — we persist finals only. The dashboard polls for new
 * segments at 1.5s while a call is in_progress so the operator sees what
 * the caller said in something close to real time.
 *
 * Idempotent on (call_id, time_offset_ms, role) — if Vapi resends the
 * same final transcript, the second insert no-ops via ON CONFLICT.
 */
async function handleTranscriptStream(
  business: Business,
  message: VapiTranscriptStreamMessage,
) {
  if (message.transcriptType !== "final") return;
  const text = (message.transcript ?? "").trim();
  if (!text) return;

  const vapiCallId = message.call?.id;
  if (!vapiCallId) return;

  // Ensure a calls row exists so we have an FK target. The end-of-call
  // handler will fill in metadata; we just need the id locked in.
  const [existing] = await db
    .select({ id: calls.id })
    .from(calls)
    .where(eq(calls.vapiCallId, vapiCallId))
    .limit(1);

  let callId: string;
  if (existing) {
    callId = existing.id;
  } else {
    const [created] = await db
      .insert(calls)
      .values({
        businessId: business.id,
        vapiCallId,
        direction:
          message.call?.type === "outboundPhoneCall" ? "outbound" : "inbound",
        status: "in_progress",
        fromNumber: message.call?.customer?.number ?? null,
        toNumber: message.call?.phoneNumber?.number ?? null,
        startedAt: message.call?.startedAt
          ? new Date(message.call.startedAt)
          : new Date(),
      })
      .returning({ id: calls.id });
    callId = created.id;
  }

  const timeOffsetMs =
    typeof message.secondsFromStart === "number"
      ? Math.max(0, Math.round(message.secondsFromStart * 1000))
      : 0;

  await db
    .insert(callTranscriptSegments)
    .values({
      businessId: business.id,
      callId,
      role: message.role,
      text,
      timeOffsetMs,
    })
    .onConflictDoNothing({
      target: [
        callTranscriptSegments.callId,
        callTranscriptSegments.timeOffsetMs,
        callTranscriptSegments.role,
      ],
    });
}

async function upsertContact(
  businessId: string,
  phone: string | undefined,
  name: string | undefined,
): Promise<string | null> {
  if (!phone) return null;

  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.businessId, businessId), eq(contacts.phone, phone)))
    .limit(1);

  if (existing) {
    await db
      .update(contacts)
      .set({ lastSeenAt: new Date() })
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

async function handleEndOfCallReport(
  business: Business,
  message: VapiEndOfCallReport,
) {
  const callPayload = message.call;
  const customerPhone = callPayload.customer?.number;
  const customerName = callPayload.customer?.name;

  const contactId = await upsertContact(
    business.id,
    customerPhone,
    customerName,
  );

  const transcriptMessages = message.artifact?.messages ?? [];
  const transcriptText =
    message.artifact?.transcript ??
    transcriptMessages
      .filter((m) => m.message)
      .map((m) => `${m.role}: ${m.message}`)
      .join("\n");

  let summaryText = message.analysis?.summary ?? null;
  let intent: typeof calls.$inferInsert.intent = null;
  let outcome: typeof calls.$inferInsert.outcome = null;
  let isEmergency = false;
  let ownerLine: string | null = null;

  if (transcriptText) {
    try {
      const result = await summarizeCall(transcriptText);
      summaryText = summaryText ?? result.summary;
      intent = result.intent;
      outcome = result.outcome;
      isEmergency = result.isEmergency;
      ownerLine = result.ownerLine;
    } catch (err) {
      await db.insert(events).values({
        businessId: business.id,
        type: "summarize.error",
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  const direction =
    callPayload.type === "outboundPhoneCall" ? "outbound" : "inbound";

  const durationSec =
    typeof message.durationSeconds === "number"
      ? Math.round(message.durationSeconds)
      : null;

  const [upserted] = await db
    .insert(calls)
    .values({
      businessId: business.id,
      contactId,
      vapiCallId: callPayload.id,
      direction,
      status: "completed",
      durationSec,
      recordingUrl: message.artifact?.recordingUrl ?? null,
      transcript: transcriptMessages.length
        ? (transcriptMessages as unknown as Record<string, unknown>[])
        : null,
      summary: summaryText,
      intent,
      outcome,
      isEmergency,
      fromNumber: customerPhone ?? null,
      toNumber: callPayload.phoneNumber?.number ?? null,
      startedAt: callPayload.startedAt ? new Date(callPayload.startedAt) : null,
      endedAt: callPayload.endedAt ? new Date(callPayload.endedAt) : null,
    })
    .onConflictDoUpdate({
      target: calls.vapiCallId,
      set: {
        contactId,
        status: "completed",
        durationSec,
        recordingUrl: message.artifact?.recordingUrl ?? null,
        transcript: transcriptMessages.length
          ? (transcriptMessages as unknown as Record<string, unknown>[])
          : null,
        summary: summaryText,
        intent,
        outcome,
        isEmergency,
        fromNumber: customerPhone ?? null,
        toNumber: callPayload.phoneNumber?.number ?? null,
        startedAt: callPayload.startedAt
          ? new Date(callPayload.startedAt)
          : null,
        endedAt: callPayload.endedAt ? new Date(callPayload.endedAt) : null,
      },
    })
    .returning({ id: calls.id });

  if (ownerLine && upserted) {
    await inngest.send({
      name: "call/summary-ready",
      data: {
        businessId: business.id,
        callId: upserted.id,
        ownerLine,
      },
    });
  }

  await db.insert(events).values({
    businessId: business.id,
    type: "call.completed",
    payload: {
      vapiCallId: callPayload.id,
      ownerLine,
      isEmergency,
    },
  });

  await trackCallCompleted({
    userId: business.ownerUserId,
    businessId: business.id,
    durationSec,
    intent,
    outcome,
    isEmergency,
  });

  if (durationSec && durationSec > 0) {
    await checkVoiceUsageAlerts(business, durationSec);
  }
}

/**
 * Fire an owner alert the first time this billing cycle crosses 80% or
 * 100% of the tier's monthly voice-minute cap. getMinutesUsedThisCycle
 * already includes the just-finished call (it's in the DB by this point),
 * so we subtract its duration to compute the "before this call" total
 * and detect the exact threshold crossing.
 */
async function checkVoiceUsageAlerts(business: Business, durationSec: number) {
  const tier = business.planTier as PlanTier;
  const cap = getMinuteCap(tier);
  if (!cap) return;

  const nextMinutes = await getMinutesUsedThisCycle(business.id);
  const prevMinutes = Math.max(0, nextMinutes - Math.round(durationSec / 60));
  const threshold = crossedThreshold(prevMinutes, nextMinutes, cap);
  if (!threshold) return;

  const message = renderUsageAlert({
    businessName: business.name,
    minutesUsed: nextMinutes,
    minuteCap: cap,
    threshold,
  });

  if (business.ownerPhone) {
    try {
      await sendSms({
        businessId: business.id,
        to: business.ownerPhone,
        body: message.sms,
        bypassQuota: true,
      });
    } catch (err) {
      await db.insert(events).values({
        businessId: business.id,
        type: "notify.usage_alert.sms.failed",
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  if (business.ownerEmail && isEmailConfigured()) {
    const sent = await sendEmail({
      to: business.ownerEmail,
      subject: message.emailSubject,
      html: message.emailHtml,
      text: message.emailText,
    });
    if (!sent.ok) {
      await db.insert(events).values({
        businessId: business.id,
        type: "notify.usage_alert.email.failed",
        payload: { reason: sent.reason },
      });
    }
  }

  await db.insert(events).values({
    businessId: business.id,
    type: `usage.${threshold}`,
    payload: { minutesUsed: nextMinutes, minuteCap: cap, tier },
  });

  await trackUsageWarningFired({
    userId: business.ownerUserId,
    businessId: business.id,
    threshold,
    minutesUsed: nextMinutes,
    minuteCap: cap,
    tier,
  });
}
