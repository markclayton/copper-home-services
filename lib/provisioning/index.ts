/**
 * provisionTenant — idempotent end-to-end setup for a single tenant.
 *
 * Order of operations:
 *   1. Buy a Twilio local number (skip if business.twilioNumber already set)
 *   2. Register that number with Vapi (skip if vapiPhoneNumberId set)
 *   3. Create or update the Vapi assistant (always run; cheap and ensures the
 *      prompt reflects current KB)
 *   4. Link the phone number to the assistant
 *   5. Persist all IDs on the businesses row
 *
 * Stripe customer creation lands in Round 4.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, events } from "@/lib/db/schema";
import { env, requireEnv } from "@/lib/env";
import { buyLocalNumber } from "./twilio";
import {
  registerPhoneNumber,
  updatePhoneNumber,
} from "@/lib/voice/vapi";
import { deployAssistant } from "@/lib/voice/deploy";
import { createCustomer } from "@/lib/billing/stripe";

export type ProvisionStep =
  | { name: string; status: "skipped" | "ok"; detail?: string }
  | { name: string; status: "failed"; detail: string };

export type ProvisionResult = {
  businessId: string;
  steps: ProvisionStep[];
  ok: boolean;
};

export async function provisionTenant(
  businessId: string,
  opts: { areaCode?: string } = {},
): Promise<ProvisionResult> {
  const steps: ProvisionStep[] = [];

  const [businessRow] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!businessRow) {
    return {
      businessId,
      ok: false,
      steps: [
        { name: "load-business", status: "failed", detail: "not found" },
      ],
    };
  }

  let twilioNumber = businessRow.twilioNumber;
  let vapiPhoneNumberId = businessRow.vapiPhoneNumberId;
  let vapiAssistantId = businessRow.vapiAssistantId;

  // Step 1: buy Twilio number
  if (twilioNumber) {
    steps.push({
      name: "twilio-number",
      status: "skipped",
      detail: `already provisioned: ${twilioNumber}`,
    });
  } else {
    try {
      const bought = await buyLocalNumber({
        businessId,
        areaCode: opts.areaCode,
      });
      twilioNumber = bought.phoneNumber;
      await db
        .update(businesses)
        .set({
          twilioNumber: bought.phoneNumber,
          twilioSubaccountSid: bought.twilioSid,
          updatedAt: new Date(),
        })
        .where(eq(businesses.id, businessId));
      steps.push({
        name: "twilio-number",
        status: "ok",
        detail: bought.phoneNumber,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      steps.push({ name: "twilio-number", status: "failed", detail: message });
      await logProvisionEvent(businessId, "provision.twilio_number.failed", {
        message,
      });
      return { businessId, steps, ok: false };
    }
  }

  // Step 2: register with Vapi
  if (vapiPhoneNumberId) {
    steps.push({
      name: "vapi-phone-number",
      status: "skipped",
      detail: vapiPhoneNumberId,
    });
  } else {
    try {
      const registered = await registerPhoneNumber({
        number: twilioNumber!,
        twilioAccountSid: requireEnv("TWILIO_ACCOUNT_SID"),
        twilioAuthToken: requireEnv("TWILIO_AUTH_TOKEN"),
        name: businessRow.name,
      });
      vapiPhoneNumberId = registered.id;
      await db
        .update(businesses)
        .set({ vapiPhoneNumberId: registered.id, updatedAt: new Date() })
        .where(eq(businesses.id, businessId));
      steps.push({
        name: "vapi-phone-number",
        status: "ok",
        detail: registered.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      steps.push({
        name: "vapi-phone-number",
        status: "failed",
        detail: message,
      });
      await logProvisionEvent(businessId, "provision.vapi_phone.failed", {
        message,
      });
      return { businessId, steps, ok: false };
    }
  }

  // Step 3: deploy assistant (always — keeps prompt fresh)
  try {
    const result = await deployAssistant(businessId);
    if (result.ok) {
      vapiAssistantId = result.assistantId;
      steps.push({
        name: "vapi-assistant",
        status: "ok",
        detail: `${result.action} ${result.assistantId}`,
      });
    } else {
      steps.push({
        name: "vapi-assistant",
        status: "failed",
        detail: result.reason,
      });
      return { businessId, steps, ok: false };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    steps.push({ name: "vapi-assistant", status: "failed", detail: message });
    return { businessId, steps, ok: false };
  }

  // Step 4: Stripe customer (idempotent, soft-fail if not configured)
  if (businessRow.stripeCustomerId) {
    steps.push({
      name: "stripe-customer",
      status: "skipped",
      detail: businessRow.stripeCustomerId,
    });
  } else if (env.STRIPE_SECRET_KEY) {
    try {
      const customerId = await createCustomer({
        businessId,
        name: businessRow.name,
        email: businessRow.ownerEmail,
        phone: businessRow.ownerPhone,
      });
      await db
        .update(businesses)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(businesses.id, businessId));
      steps.push({
        name: "stripe-customer",
        status: "ok",
        detail: customerId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      steps.push({
        name: "stripe-customer",
        status: "failed",
        detail: message,
      });
    }
  } else {
    steps.push({
      name: "stripe-customer",
      status: "skipped",
      detail: "STRIPE_SECRET_KEY not set",
    });
  }

  // Step 5: link phone number → assistant
  if (vapiPhoneNumberId && vapiAssistantId) {
    try {
      await updatePhoneNumber(vapiPhoneNumberId, {
        assistantId: vapiAssistantId,
      });
      steps.push({ name: "link-phone-to-assistant", status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      steps.push({
        name: "link-phone-to-assistant",
        status: "failed",
        detail: message,
      });
    }
  }

  await logProvisionEvent(businessId, "provision.completed", {
    steps,
    appUrl: env.APP_URL,
  });

  return { businessId, steps, ok: true };
}

async function logProvisionEvent(
  businessId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  await db.insert(events).values({ businessId, type, payload });
}
