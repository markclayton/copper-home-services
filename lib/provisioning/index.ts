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
import { extractUsAreaCode } from "@/lib/format";
import { attachToMessagingService, buyLocalNumber } from "./twilio";
import {
  registerPhoneNumber,
  updatePhoneNumber,
} from "@/lib/voice/vapi";
import { deployAssistant } from "@/lib/voice/deploy";
import { createCustomer } from "@/lib/billing/stripe";
import { createEventType } from "@/lib/booking/cal";

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
  let twilioPhoneSid = businessRow.twilioSubaccountSid;
  let vapiPhoneNumberId = businessRow.vapiPhoneNumberId;
  let vapiAssistantId = businessRow.vapiAssistantId;
  let calComEventTypeId = businessRow.calComEventTypeId;

  const demoMode = !!(
    env.DEMO_TWILIO_NUMBER && env.DEMO_VAPI_PHONE_NUMBER_ID
  );

  // Step 1: buy Twilio number (or reuse demo number)
  if (twilioNumber) {
    steps.push({
      name: "twilio-number",
      status: "skipped",
      detail: `already provisioned: ${twilioNumber}`,
    });
  } else if (demoMode) {
    twilioNumber = env.DEMO_TWILIO_NUMBER!;
    twilioPhoneSid = null; // no real SID — A2P attach + webhook refresh skip
    await db
      .update(businesses)
      .set({ twilioNumber, updatedAt: new Date() })
      .where(eq(businesses.id, businessId));
    steps.push({
      name: "twilio-number",
      status: "ok",
      detail: `demo: ${twilioNumber}`,
    });
  } else {
    // Default to the owner's area code so the new Twilio number reads as
    // local to their customers. Falls back to any-US-local if either the
    // owner phone isn't parseable or Twilio has no inventory in that area
    // code right now (the latter handled inside buyLocalNumber).
    const preferredAreaCode =
      opts.areaCode ?? extractUsAreaCode(businessRow.ownerPhone) ?? undefined;
    try {
      const bought = await buyLocalNumber({
        businessId,
        areaCode: preferredAreaCode,
      });
      twilioNumber = bought.phoneNumber;
      twilioPhoneSid = bought.twilioSid;
      await db
        .update(businesses)
        .set({
          twilioNumber: bought.phoneNumber,
          twilioSubaccountSid: bought.twilioSid,
          updatedAt: new Date(),
        })
        .where(eq(businesses.id, businessId));
      const detail = bought.fellBack
        ? `${bought.phoneNumber} (no inventory in area code ${bought.requestedAreaCode}, fell back to any US local)`
        : bought.requestedAreaCode
          ? `${bought.phoneNumber} (area code ${bought.requestedAreaCode})`
          : bought.phoneNumber;
      steps.push({
        name: "twilio-number",
        status: "ok",
        detail,
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

  // Step 1.5: attach number to A2P 10DLC Messaging Service so SMS clears
  // carrier filtering. Twilio API returns 409 if already attached, which
  // attachToMessagingService swallows.
  if (demoMode) {
    steps.push({
      name: "a2p-attach",
      status: "skipped",
      detail: "demo mode",
    });
  } else if (twilioNumber && env.TWILIO_MESSAGING_SERVICE_SID) {
    if (!twilioPhoneSid) {
      steps.push({
        name: "a2p-attach",
        status: "skipped",
        detail: "twilio number SID not available",
      });
    } else {
      try {
        await attachToMessagingService({
          twilioSid: twilioPhoneSid,
          messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID,
        });
        steps.push({ name: "a2p-attach", status: "ok" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        steps.push({ name: "a2p-attach", status: "failed", detail: message });
        await logProvisionEvent(businessId, "provision.a2p_attach.failed", {
          message,
        });
      }
    }
  } else {
    steps.push({
      name: "a2p-attach",
      status: "skipped",
      detail: "TWILIO_MESSAGING_SERVICE_SID not set",
    });
  }

  // Step 2: register with Vapi (or reuse demo phone number)
  if (vapiPhoneNumberId) {
    steps.push({
      name: "vapi-phone-number",
      status: "skipped",
      detail: vapiPhoneNumberId,
    });
  } else if (demoMode) {
    vapiPhoneNumberId = env.DEMO_VAPI_PHONE_NUMBER_ID!;
    await db
      .update(businesses)
      .set({ vapiPhoneNumberId, updatedAt: new Date() })
      .where(eq(businesses.id, businessId));
    steps.push({
      name: "vapi-phone-number",
      status: "ok",
      detail: `demo: ${vapiPhoneNumberId}`,
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

  // Step 2.5: Cal.com event type (idempotent, soft-fail if not configured).
  // Must run before deployAssistant so the assistant prompt + tools see a
  // valid event type id.
  if (calComEventTypeId) {
    steps.push({
      name: "cal-event-type",
      status: "skipped",
      detail: calComEventTypeId,
    });
  } else if (env.CAL_COM_API_KEY) {
    try {
      const slug = `${businessRow.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30)}-${businessId.slice(0, 8)}`;
      const eventType = await createEventType({
        title: `${businessRow.name} — Service Visit`,
        slug,
        lengthInMinutes: 60,
        description: "Service visit booked through the AI receptionist.",
      });
      calComEventTypeId = String(eventType.id);
      await db
        .update(businesses)
        .set({ calComEventTypeId, updatedAt: new Date() })
        .where(eq(businesses.id, businessId));
      steps.push({
        name: "cal-event-type",
        status: "ok",
        detail: calComEventTypeId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      steps.push({ name: "cal-event-type", status: "failed", detail: message });
      await logProvisionEvent(businessId, "provision.cal_event_type.failed", {
        message,
      });
    }
  } else {
    steps.push({
      name: "cal-event-type",
      status: "skipped",
      detail: "CAL_COM_API_KEY not set",
    });
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
