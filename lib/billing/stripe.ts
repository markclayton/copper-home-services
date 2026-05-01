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
 * Self-serve signup checkout. Creates a Stripe customer for the new tenant,
 * then a subscription checkout session that returns the customer to the
 * "we're setting up your AI" wait page on success.
 */
export async function createSelfServeCheckout(args: {
  businessId: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone: string;
}): Promise<{ url: string; customerId: string }> {
  const stripe = getStripe();
  const mrrPrice = requireEnv("STRIPE_PRICE_MRR");

  const customer = await stripe.customers.create({
    name: args.ownerName,
    email: args.ownerEmail,
    phone: args.ownerPhone,
    metadata: { businessId: args.businessId },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: mrrPrice, quantity: 1 }],
    success_url: `${env.APP_URL}/onboard/setup/${args.businessId}`,
    cancel_url: `${env.APP_URL}/onboard?status=canceled`,
    subscription_data: {
      metadata: { businessId: args.businessId },
    },
    metadata: { businessId: args.businessId, flow: "new_tenant" },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  return { url: session.url, customerId: customer.id };
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
