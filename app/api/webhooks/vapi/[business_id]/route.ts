import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  businesses,
  calls,
  contacts,
  events,
  type Business,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { summarizeCall } from "@/lib/ai/llm";
import { handleToolCall, type ToolCtx } from "@/lib/voice/tool-handlers";
import { sendSms } from "@/lib/telephony/twilio";
import { inngest } from "@/lib/jobs/client";
import type {
  VapiCallSummary,
  VapiEndOfCallReport,
  VapiServerPayload,
  VapiStatusUpdate,
  VapiToolCallsMessage,
  VapiToolResponse,
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
    case "assistant-request":
      await db.insert(events).values({
        businessId,
        type: "vapi.assistant-request",
        payload: message as unknown as Record<string, unknown>,
      });
      return NextResponse.json({ ok: true });
    case "conversation-update":
    case "transcript":
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

  if (message.status === "in-progress" || message.status === "in_progress") {
    await maybeFireMissedCallTextback(business, message.call);
  }
}

async function maybeFireMissedCallTextback(
  business: Business,
  call: VapiCallSummary,
) {
  const isInbound = call.type !== "outboundPhoneCall";
  const customerPhone = call.customer?.number;
  if (!isInbound || !customerPhone) return;

  // Idempotency: only one text-back per vapi call id.
  const eventType = "missed_call_textback.sent";
  const existing = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.businessId, business.id),
        eq(events.type, eventType),
        sql`${events.payload}->>'vapiCallId' = ${call.id}`,
      ),
    )
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(events).values({
    businessId: business.id,
    type: eventType,
    payload: { vapiCallId: call.id, to: customerPhone },
  });

  try {
    await sendSms({
      businessId: business.id,
      to: customerPhone,
      body: `Hey, this is ${business.name} — sorry we missed you. Our AI assistant just called you back, or reply here and we'll text you.`,
    });
  } catch (err) {
    await db.insert(events).values({
      businessId: business.id,
      type: "missed_call_textback.failed",
      payload: {
        vapiCallId: call.id,
        message: err instanceof Error ? err.message : String(err),
      },
    });
  }
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
}
