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

/**
 * New-tenant signup checkout — final step of the onboarding wizard.
 * Includes a 7-day free trial with card up front. The card isn't charged
 * until day 7, but Stripe collects it now to filter for serious customers.
 */
export async function createOnboardingCheckout(args: {
  customerId: string;
  businessId: string;
  withTrial: boolean;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const mrrPrice = requireEnv("STRIPE_PRICE_MRR");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: args.customerId,
    line_items: [{ price: mrrPrice, quantity: 1 }],
    success_url: `${env.APP_URL}/onboard/setup/${args.businessId}`,
    cancel_url: `${env.APP_URL}/onboard/plan?status=canceled`,
    subscription_data: {
      metadata: { businessId: args.businessId },
      ...(args.withTrial ? { trial_period_days: 7 } : {}),
    },
    metadata: { businessId: args.businessId, flow: "new_tenant" },
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
