import Stripe from "stripe";
import { env, requireEnv } from "@/lib/env";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return cached;
}

export async function createCustomer(args: {
  businessId: string;
  name: string;
  email: string;
  phone: string;
}): Promise<string> {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: args.name,
    email: args.email,
    phone: args.phone,
    metadata: { businessId: args.businessId },
  });
  return customer.id;
}

/**
 * Existing-tenant activation checkout (used from /dashboard/billing). Setup
 * fee included only when STRIPE_PRICE_SETUP is set.
 */
export async function createCheckoutSession(args: {
  customerId: string;
  businessId: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const mrrPrice = requireEnv("STRIPE_PRICE_MRR");
  const setupPrice = env.STRIPE_PRICE_SETUP;

  const lineItems: Array<{ price: string; quantity: number }> = [
    { price: mrrPrice, quantity: 1 },
  ];
  if (setupPrice) {
    lineItems.unshift({ price: setupPrice, quantity: 1 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: args.customerId,
    line_items: lineItems,
    success_url: `${env.APP_URL}/dashboard/billing?status=success`,
    cancel_url: `${env.APP_URL}/dashboard/billing?status=canceled`,
    subscription_data: {
      metadata: { businessId: args.businessId },
    },
    metadata: { businessId: args.businessId, flow: "tenant_activation" },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  return { url: session.url };
}

export type SelfServePlan = "solo" | "business";

/**
 * Resolves the Stripe price for a self-serve plan. Falls back through:
 *   1. Plan-specific env (STRIPE_PRICE_SOLO / STRIPE_PRICE_BUSINESS)
 *   2. Legacy STRIPE_PRICE_MRR (single-price deploys keep working)
 *   3. The other plan's env (so a deploy with only one tier configured
 *      doesn't crash if the cookie lands on the other one)
 */
export function resolveSelfServePrice(plan: SelfServePlan): string {
  const planEnv = plan === "solo" ? env.STRIPE_PRICE_SOLO : env.STRIPE_PRICE_BUSINESS;
  if (planEnv) return planEnv;
  if (env.STRIPE_PRICE_MRR) return env.STRIPE_PRICE_MRR;
  const otherEnv = plan === "solo" ? env.STRIPE_PRICE_BUSINESS : env.STRIPE_PRICE_SOLO;
  if (otherEnv) return otherEnv;
  throw new Error(
    "No Stripe price configured. Set STRIPE_PRICE_SOLO, STRIPE_PRICE_BUSINESS, or STRIPE_PRICE_MRR.",
  );
}

/**
 * New-tenant signup checkout — final step of the onboarding wizard.
 * Includes a 7-day free trial with card up front. The card isn't charged
 * until day 7, but Stripe collects it now to filter for serious customers.
 */
export async function createOnboardingCheckout(args: {
  customerId: string;
  businessId: string;
  withTrial: boolean;
  plan: SelfServePlan;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const price = resolveSelfServePrice(args.plan);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: args.customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${env.APP_URL}/onboard/setup/${args.businessId}`,
    cancel_url: `${env.APP_URL}/onboard/plan?status=canceled`,
    subscription_data: {
      metadata: { businessId: args.businessId, plan: args.plan },
      ...(args.withTrial ? { trial_period_days: 7 } : {}),
    },
    metadata: { businessId: args.businessId, flow: "new_tenant", plan: args.plan },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  return { url: session.url };
}

export async function createPortalSession(args: {
  customerId: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: args.customerId,
    return_url: `${env.APP_URL}/dashboard/billing`,
  });
  return { url: session.url };
}
