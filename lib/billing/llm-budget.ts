/**
 * Rolling-30-day LLM + embedding spend cap, per tenant. Sums the
 * `unit_economics_events` rows we already write at every model call site
 * (see lib/billing/unit-events.ts: recordAnthropicUsage,
 * recordEmbeddingUsage) and throws when the tenant's tier budget — or
 * the tighter trial budget — would be exceeded.
 *
 * Stops a runaway loop or a KB-crawl-abuse pattern from quietly burning
 * vendor money. Doesn't replace the soft minute-cap alerts, which
 * notify the owner well before they get close to a ceiling.
 */

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, unitEconomicsEvents } from "@/lib/db/schema";
import {
  getLlmBudgetMicroCents,
  isTrialing,
  TRIAL_LLM_BUDGET_MICROCENTS,
  type PlanTier,
} from "./plans";

export class LlmBudgetExceededError extends Error {
  constructor(
    public businessId: string,
    public spentMicroCents: number,
    public capMicroCents: number,
    public reason: "trial_budget" | "tier_budget",
  ) {
    super(
      `LLM budget exceeded for ${businessId}: ${spentMicroCents}/${capMicroCents} (${reason})`,
    );
    this.name = "LlmBudgetExceededError";
  }
}

/** Rolling-30-day LLM + embedding spend in micro-cents. */
export async function getLlmSpendMicroCents(
  businessId: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${unitEconomicsEvents.totalMicroCents}), 0)`,
    })
    .from(unitEconomicsEvents)
    .where(
      and(
        eq(unitEconomicsEvents.businessId, businessId),
        inArray(unitEconomicsEvents.source, ["anthropic", "openai"]),
        gte(unitEconomicsEvents.createdAt, sql`now() - interval '30 days'`),
      ),
    );
  return Number(row?.total ?? 0);
}

type BudgetContext = {
  businessId: string;
  planTier: PlanTier;
  stripeSubscriptionStatus: string | null | undefined;
};

/**
 * Throws LlmBudgetExceededError if the tenant has spent past their cap.
 * Trial tenants use the tighter trial budget; paid tenants use the
 * per-tier budget. Tenants on a tier with no defined cap (custom) pass.
 *
 * Call this BEFORE the model invocation. The check is one indexed sum
 * over a tenant-scoped table — fast enough to put on the hot path.
 */
export async function assertLlmBudgetAvailable(
  ctx: BudgetContext,
): Promise<void> {
  const trialing = isTrialing(ctx.stripeSubscriptionStatus);
  const cap = trialing
    ? TRIAL_LLM_BUDGET_MICROCENTS
    : getLlmBudgetMicroCents(ctx.planTier);
  if (cap === null) return;

  const spent = await getLlmSpendMicroCents(ctx.businessId);
  if (spent >= cap) {
    throw new LlmBudgetExceededError(
      ctx.businessId,
      spent,
      cap,
      trialing ? "trial_budget" : "tier_budget",
    );
  }
}

/** Convenience: hydrate the budget context from a businessId. Useful at
 *  call sites that don't already have the Business row in scope. */
export async function assertLlmBudgetByBusinessId(
  businessId: string,
): Promise<void> {
  const [biz] = await db
    .select({
      id: businesses.id,
      planTier: businesses.planTier,
      stripeSubscriptionStatus: businesses.stripeSubscriptionStatus,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (!biz) return;
  await assertLlmBudgetAvailable({
    businessId: biz.id,
    planTier: biz.planTier,
    stripeSubscriptionStatus: biz.stripeSubscriptionStatus,
  });
}
