/**
 * Tier-level service caps. Solo's minute cap is the only one that bites
 * at typical V1 usage — Business's number is set well above realistic
 * volume for a 2-10 person shop so it functions as a "fair use" ceiling
 * rather than a real gate.
 *
 * For paid tenants enforcement is soft: at 80% / 100% we alert the owner
 * recommending an upgrade, calls keep going through. Hard-blocking calls
 * on a paying customer's receptionist would cost more in churn than the
 * margin we'd lose absorbing an outlier month.
 *
 * Trial tenants are different. Until the card actually charges we have
 * no signal a person isn't farming the sandbox, so the trial caps below
 * ARE hard-enforced — the assistant gets paused via Vapi when crossed,
 * and resumes the moment the subscription flips to active.
 */
export type PlanTier = "default" | "solo" | "business" | "custom";

export const MINUTE_CAPS: Record<PlanTier, number | null> = {
  default: 500,
  solo: 500,
  business: 2000,
  custom: null,
};

/** Hard cap on voice minutes during the Stripe trial window. Sized so a
 *  real owner has room to take a handful of test calls but a bad actor
 *  can't accumulate a meaningful Vapi bill before their card charges. */
export const TRIAL_VOICE_MINUTE_CAP = 30;

/** Hard cap on rolling-30-day LLM + embedding spend per tenant, in
 *  micro-cents (1e8 = $1.00). Sized comfortably above expected per-tenant
 *  spend so it bites only on a runaway loop or KB-crawl abuse. */
export const LLM_BUDGET_MICROCENTS: Record<PlanTier, number | null> = {
  default: 1_500_000_000, // ~$15
  solo: 1_500_000_000,
  business: 7_500_000_000, // ~$75
  custom: null,
};

/** Hard cap on LLM spend during the Stripe trial window. Far tighter than
 *  any paid tier — a trial user has no business hitting this unless they're
 *  abusing the KB crawler or scripting calls. */
export const TRIAL_LLM_BUDGET_MICROCENTS = 500_000_000; // ~$5

/** Stripe sub statuses that mean "trial in progress". Kept here (not in
 *  lifecycle.ts) so call sites that already import from plans don't pick
 *  up a wider lifecycle dependency. */
export function isTrialing(
  stripeSubscriptionStatus: string | null | undefined,
): boolean {
  return stripeSubscriptionStatus === "trialing";
}

export function getMinuteCap(tier: PlanTier): number | null {
  return MINUTE_CAPS[tier];
}

export function getLlmBudgetMicroCents(tier: PlanTier): number | null {
  return LLM_BUDGET_MICROCENTS[tier];
}

export function tierFromStripeMetadata(
  plan: string | undefined | null,
): PlanTier {
  if (plan === "solo") return "solo";
  if (plan === "business") return "business";
  return "default";
}
