/**
 * Per-event provider cost capture. All functions are best-effort —
 * a logging failure must never break the main flow (a call still
 * needs to complete even if we couldn't write the cost row).
 *
 * Dedup happens at the DB layer via the partial unique index on
 * (source, source_id). Callers that already have a vendor id pass it;
 * if absent, we let the insert proceed and accept the small chance
 * of a duplicate from a webhook retry — over-counting one tenant's
 * cost a few times a month is cheaper to deal with than blocking the
 * main path on cost telemetry.
 */

import { db } from "@/lib/db";
import { unitEconomicsEvents } from "@/lib/db/schema";
import { anthropicFamily, unitPrices } from "./unit-prices";

type BaseArgs = {
  businessId: string;
  sourceId?: string | null;
  callId?: string | null;
  messageId?: string | null;
};

async function insertSafely(
  values: typeof unitEconomicsEvents.$inferInsert,
): Promise<void> {
  try {
    await db
      .insert(unitEconomicsEvents)
      .values(values)
      .onConflictDoNothing();
  } catch {
    // Swallow — cost telemetry is not on the critical path. The miss
    // shows up as a gap in roll-ups; nothing else breaks.
  }
}

export async function recordVoiceMinutes(
  args: BaseArgs & { durationSec: number },
): Promise<void> {
  if (!Number.isFinite(args.durationSec) || args.durationSec <= 0) return;
  const minutes = args.durationSec / 60;
  const unitPrice = unitPrices().vapiPerMinute;
  await insertSafely({
    businessId: args.businessId,
    eventType: "voice_minute",
    quantity: minutes.toFixed(6),
    unitPriceMicroCents: unitPrice.toFixed(6),
    totalMicroCents: (minutes * unitPrice).toFixed(6),
    source: "vapi",
    sourceId: args.sourceId ?? null,
    callId: args.callId ?? null,
    messageId: args.messageId ?? null,
  });
}

export async function recordSmsSegments(
  args: BaseArgs & { segments: number },
): Promise<void> {
  if (!Number.isFinite(args.segments) || args.segments <= 0) return;
  const unitPrice = unitPrices().twilioSmsPerSegment;
  await insertSafely({
    businessId: args.businessId,
    eventType: "sms_segment",
    quantity: args.segments.toFixed(6),
    unitPriceMicroCents: unitPrice.toFixed(6),
    totalMicroCents: (args.segments * unitPrice).toFixed(6),
    source: "twilio",
    sourceId: args.sourceId ?? null,
    callId: args.callId ?? null,
    messageId: args.messageId ?? null,
  });
}

export async function recordAnthropicUsage(
  args: BaseArgs & {
    model: string;
    inputTokens: number;
    outputTokens: number;
  },
): Promise<void> {
  const fam = anthropicFamily(args.model);
  const prices = unitPrices();
  const inputUnit =
    fam === "haiku"
      ? prices.anthropicHaikuInputPerToken
      : prices.anthropicSonnetInputPerToken;
  const outputUnit =
    fam === "haiku"
      ? prices.anthropicHaikuOutputPerToken
      : prices.anthropicSonnetOutputPerToken;

  const rows: typeof unitEconomicsEvents.$inferInsert[] = [];

  if (Number.isFinite(args.inputTokens) && args.inputTokens > 0) {
    rows.push({
      businessId: args.businessId,
      eventType: "ai_input_token",
      quantity: args.inputTokens.toFixed(6),
      unitPriceMicroCents: inputUnit.toFixed(6),
      totalMicroCents: (args.inputTokens * inputUnit).toFixed(6),
      source: "anthropic",
      sourceId: args.sourceId ? `${args.sourceId}:in` : null,
      callId: args.callId ?? null,
      messageId: args.messageId ?? null,
    });
  }
  if (Number.isFinite(args.outputTokens) && args.outputTokens > 0) {
    rows.push({
      businessId: args.businessId,
      eventType: "ai_output_token",
      quantity: args.outputTokens.toFixed(6),
      unitPriceMicroCents: outputUnit.toFixed(6),
      totalMicroCents: (args.outputTokens * outputUnit).toFixed(6),
      source: "anthropic",
      sourceId: args.sourceId ? `${args.sourceId}:out` : null,
      callId: args.callId ?? null,
      messageId: args.messageId ?? null,
    });
  }

  if (rows.length === 0) return;
  try {
    await db.insert(unitEconomicsEvents).values(rows).onConflictDoNothing();
  } catch {
    // best-effort
  }
}

export async function recordEmbeddingUsage(
  args: BaseArgs & { tokens: number },
): Promise<void> {
  if (!Number.isFinite(args.tokens) || args.tokens <= 0) return;
  const unitPrice = unitPrices().openaiEmbeddingPerToken;
  await insertSafely({
    businessId: args.businessId,
    eventType: "embedding_token",
    quantity: args.tokens.toFixed(6),
    unitPriceMicroCents: unitPrice.toFixed(6),
    totalMicroCents: (args.tokens * unitPrice).toFixed(6),
    source: "openai",
    sourceId: args.sourceId ?? null,
    callId: args.callId ?? null,
    messageId: args.messageId ?? null,
  });
}
