"use server";

import { redirect } from "next/navigation";
import { requireLiveOrPausedBusiness } from "@/lib/db/queries";
import { createPortalSession } from "@/lib/billing/stripe";

/**
 * Send a paused tenant to the Stripe Customer Portal so they can update
 * their card or restart their subscription. Once Stripe processes the
 * change, the subscription webhook flips status back to "live" and clears
 * scheduledTeardownAt (see handleSubscriptionUpdated).
 */
export async function openReactivationPortal() {
  const { business } = await requireLiveOrPausedBusiness();
  if (!business.stripeCustomerId) {
    throw new Error("No Stripe customer on file — contact support.");
  }
  const { url } = await createPortalSession({
    customerId: business.stripeCustomerId,
  });
  redirect(url);
}
