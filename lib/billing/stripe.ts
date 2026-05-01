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
  const setupPrice = requireEnv("STRIPE_PRICE_SETUP");
  const mrrPrice = requireEnv("STRIPE_PRICE_MRR");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: args.customerId,
    line_items: [
      { price: setupPrice, quantity: 1 },
      { price: mrrPrice, quantity: 1 },
    ],
    success_url: `${env.APP_URL}/dashboard/billing?status=success`,
    cancel_url: `${env.APP_URL}/dashboard/billing?status=canceled`,
    subscription_data: {
      metadata: { businessId: args.businessId },
    },
    metadata: { businessId: args.businessId },
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
