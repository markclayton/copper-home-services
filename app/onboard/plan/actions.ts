"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { loadDraftSession } from "@/lib/onboarding/draft-business";
import {
  createCustomer,
  createOnboardingCheckout,
} from "@/lib/billing/stripe";

export type PlanStepState = { ok: boolean; error?: string };

export async function startSubscription(
  _prev: PlanStepState,
  form: FormData,
): Promise<PlanStepState> {
  const { business } = await loadDraftSession();

  // Create Stripe customer if missing (idempotent guard for re-tries).
  let stripeCustomerId = business.stripeCustomerId;
  if (!stripeCustomerId) {
    try {
      stripeCustomerId = await createCustomer({
        businessId: business.id,
        name: business.name || business.ownerName || "New customer",
        email: business.ownerEmail,
        phone: business.ownerPhone,
      });
      await db
        .update(businesses)
        .set({ stripeCustomerId, updatedAt: new Date() })
        .where(eq(businesses.id, business.id));
    } catch (err) {
      return {
        ok: false,
        error: `Couldn't create Stripe customer: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  const withTrial = form.get("withTrial") !== "false";

  let url: string;
  try {
    const result = await createOnboardingCheckout({
      customerId: stripeCustomerId,
      businessId: business.id,
      withTrial,
    });
    url = result.url;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  redirect(url);
}
