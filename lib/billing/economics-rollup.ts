/**
 * Per-tenant cost roll-up for the operator's bottom-of-the-funnel view:
 * how much did we spend on providers to deliver this tenant's service?
 *
 * Returns micro-cents aggregated by event_type so callers can format
 * however they want. The Stripe-side revenue join lives in the CLI
 * script and the admin UI — not in this helper — so this function stays
 * easy to reuse from a one-shot script or a per-tenant API response.
 */

import { and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  unitEconomicsEvents,
  type UnitEconomicsEvent,
} from "@/lib/db/schema";

export type EconomicsTotals = {
  voiceMicroCents: number;
  smsMicroCents: number;
  aiInputMicroCents: number;
  aiOutputMicroCents: number;
  embeddingMicroCents: number;
  totalMicroCents: number;
  voiceMinutes: number;
  smsSegments: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  embeddingTokens: number;
  eventCount: number;
};

const EMPTY: EconomicsTotals = {
  voiceMicroCents: 0,
  smsMicroCents: 0,
  aiInputMicroCents: 0,
  aiOutputMicroCents: 0,
  embeddingMicroCents: 0,
  totalMicroCents: 0,
  voiceMinutes: 0,
  smsSegments: 0,
  aiInputTokens: 0,
  aiOutputTokens: 0,
  embeddingTokens: 0,
  eventCount: 0,
};

/**
 * Aggregate cost by event_type for one tenant in a time range. Pure
 * SQL — no JS-side reduction over individual rows so this works at
 * volume.
 */
export async function getEconomicsRollup(
  businessId: string,
  range: { since?: Date; until?: Date } = {},
): Promise<EconomicsTotals> {
  const filters = [sql`business_id = ${businessId}`];
  if (range.since) filters.push(gte(unitEconomicsEvents.createdAt, range.since));
  if (range.until) filters.push(lte(unitEconomicsEvents.createdAt, range.until));

  const rows = await db
    .select({
      eventType: unitEconomicsEvents.eventType,
      totalMicroCents: sql<string>`sum(${unitEconomicsEvents.totalMicroCents})`,
      quantity: sql<string>`sum(${unitEconomicsEvents.quantity})`,
      count: sql<string>`count(*)`,
    })
    .from(unitEconomicsEvents)
    .where(and(...filters))
    .groupBy(unitEconomicsEvents.eventType);

  const totals = { ...EMPTY };
  for (const r of rows) {
    const cost = Number(r.totalMicroCents) || 0;
    const qty = Number(r.quantity) || 0;
    const ct = Number(r.count) || 0;
    totals.eventCount += ct;
    totals.totalMicroCents += cost;
    switch (r.eventType as UnitEconomicsEvent["eventType"]) {
      case "voice_minute":
        totals.voiceMicroCents += cost;
        totals.voiceMinutes += qty;
        break;
      case "sms_segment":
        totals.smsMicroCents += cost;
        totals.smsSegments += qty;
        break;
      case "ai_input_token":
        totals.aiInputMicroCents += cost;
        totals.aiInputTokens += qty;
        break;
      case "ai_output_token":
        totals.aiOutputMicroCents += cost;
        totals.aiOutputTokens += qty;
        break;
      case "embedding_token":
        totals.embeddingMicroCents += cost;
        totals.embeddingTokens += qty;
        break;
    }
  }
  return totals;
}

/** Start of the current calendar month in UTC. */
export function startOfMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
