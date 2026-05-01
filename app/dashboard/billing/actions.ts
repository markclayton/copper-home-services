"use server";

import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/db/queries";
import {
  createCheckoutSession,
  createPortalSession,
} from "@/lib/billing/stripe";

export async function startCheckout() {
  const { business } = await requireBusiness();
  if (!business.stripeCustomerId) {
    throw new Error(
      "Stripe customer not yet created. Ask your operator to finish provisioning.",
    );
  }
  const { url } = await createCheckoutSession({
    customerId: business.stripeCustomerId,
    businessId: business.id,
  });
  redirect(url);
}

export async function openCustomerPortal() {
  const { business } = await requireBusiness();
  if (!business.stripeCustomerId) {
    throw new Error("Stripe customer not yet created.");
  }
  const { url } = await createPortalSession({
    customerId: business.stripeCustomerId,
  });
  redirect(url);
}
