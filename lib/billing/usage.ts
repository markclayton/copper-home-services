import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { calls } from "@/lib/db/schema";
import { getMinuteCap, type PlanTier } from "./plans";

/**
 * Rolling-30-day voice usage. Cheaper than tying to Stripe's actual billing
 * anchor and accurate enough for the alert flow — the user cares about
 * "am I burning through this?" not "what's my anchor day?". When we have
 * stripeSubscriptionId + cycle dates plumbed everywhere we can swap to
 * the exact billing window without changing the call sites.
 */
export async function getMinutesUsedThisCycle(
  businessId: string,
): Promise<number> {
  const since = sql`now() - interval '30 days'`;
  const [row] = await db
    .select({
      seconds: sql<number>`coalesce(sum(${calls.durationSec}), 0)::int`,
    })
    .from(calls)
    .where(
      and(eq(calls.businessId, businessId), gte(calls.createdAt, since)),
    );
  const seconds = Number(row?.seconds ?? 0);
  return Math.round(seconds / 60);
}

export type UsageSnapshot = {
  minutesUsed: number;
  minuteCap: number | null;
  pctUsed: number | null;
};

export async function getUsageSnapshot(
  businessId: string,
  tier: PlanTier,
): Promise<UsageSnapshot> {
  const minutesUsed = await getMinutesUsedThisCycle(businessId);
  const minuteCap = getMinuteCap(tier);
  const pctUsed = minuteCap ? minutesUsed / minuteCap : null;
  return { minutesUsed, minuteCap, pctUsed };
}

/**
 * Returns the warning band a tenant just crossed, or null. The post-call
 * hook calls this twice — once with the duration of the current call
 * already counted, once with it excluded — to detect the exact threshold
 * crossing and avoid re-firing the alert every subsequent call.
 */
export function crossedThreshold(
  prevMinutes: number,
  nextMinutes: number,
  cap: number,
): "warning" | "exceeded" | null {
  const warningAt = Math.floor(cap * 0.8);
  if (prevMinutes < cap && nextMinutes >= cap) return "exceeded";
  if (prevMinutes < warningAt && nextMinutes >= warningAt) return "warning";
  return null;
}
