/**
 * Tier-level service caps. Solo's minute cap is the only one that bites
 * at typical V1 usage — Business's number is set well above realistic
 * volume for a 2-10 person shop so it functions as a "fair use" ceiling
 * rather than a real gate.
 *
 * Enforcement is soft: when a tenant crosses 80% or 100% of their cap,
 * we send the owner an alert recommending an upgrade. Calls keep going
 * through. Hard-blocking calls on a home services receptionist would
 * cost the customer relationships that matter more than the margin
 * we'd lose absorbing one outlier month.
 */
export type PlanTier = "default" | "solo" | "business" | "custom";

export const MINUTE_CAPS: Record<PlanTier, number | null> = {
  default: 500,
  solo: 500,
  business: 2000,
  custom: null,
};

export function getMinuteCap(tier: PlanTier): number | null {
  return MINUTE_CAPS[tier];
}

export function tierFromStripeMetadata(
  plan: string | undefined | null,
): PlanTier {
  if (plan === "solo") return "solo";
  if (plan === "business") return "business";
  return "default";
}
