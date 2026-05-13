/**
 * deprovisionTenant — tears down every external resource provisioned for a
 * tenant, then deletes the business row (which cascades to all owned data via
 * the FK constraints on contacts / calls / messages / appointments / etc.).
 *
 * Each external resource is best-effort: failures are logged on the step
 * record but never block the local DB delete. Orphaned Stripe customers or
 * Vapi assistants can be swept up later — what matters is that the user is
 * fully gone from our system.
 *
 * Demo mode safety: when DEMO_TWILIO_NUMBER + DEMO_VAPI_PHONE_NUMBER_ID are
 * set, the Twilio number and Vapi phone-number record are shared across
 * tenants. Releasing them would break every other demo tenant — so we skip.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getTwilioClient } from "@/lib/telephony/twilio";
import { getStripe } from "@/lib/billing/stripe";
import { deleteAssistant, deletePhoneNumber } from "@/lib/voice/vapi";
import { deleteEventType } from "@/lib/booking/cal";

export type DeprovisionStep =
  | { name: string; status: "skipped" | "ok"; detail?: string }
  | { name: string; status: "failed"; detail: string };

export type DeprovisionResult = {
  steps: DeprovisionStep[];
  ok: boolean;
};

export async function deprovisionTenant(
  businessId: string,
): Promise<DeprovisionResult> {
  const steps: DeprovisionStep[] = [];

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return {
      steps: [{ name: "load-business", status: "failed", detail: "not found" }],
      ok: false,
    };
  }

  const demoMode = !!(
    env.DEMO_TWILIO_NUMBER && env.DEMO_VAPI_PHONE_NUMBER_ID
  );

  // Stripe — cancel subscription before deleting the customer; otherwise
  // Stripe complains about deleting customers with active subs.
  if (business.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(business.stripeSubscriptionId);
      steps.push({ name: "stripe-subscription", status: "ok" });
    } catch (err) {
      steps.push({
        name: "stripe-subscription",
        status: "failed",
        detail: errMessage(err),
      });
    }
  } else {
    steps.push({ name: "stripe-subscription", status: "skipped" });
  }

  if (business.stripeCustomerId) {
    try {
      await getStripe().customers.del(business.stripeCustomerId);
      steps.push({ name: "stripe-customer", status: "ok" });
    } catch (err) {
      steps.push({
        name: "stripe-customer",
        status: "failed",
        detail: errMessage(err),
      });
    }
  } else {
    steps.push({ name: "stripe-customer", status: "skipped" });
  }

  // Vapi assistant — always safe to delete (one per tenant).
  if (business.vapiAssistantId) {
    try {
      await deleteAssistant(business.vapiAssistantId);
      steps.push({ name: "vapi-assistant", status: "ok" });
    } catch (err) {
      steps.push({
        name: "vapi-assistant",
        status: "failed",
        detail: errMessage(err),
      });
    }
  } else {
    steps.push({ name: "vapi-assistant", status: "skipped" });
  }

  // Vapi phone-number record — skip in demo mode (shared resource).
  if (business.vapiPhoneNumberId) {
    if (demoMode) {
      steps.push({
        name: "vapi-phone-number",
        status: "skipped",
        detail: "demo mode — shared",
      });
    } else {
      try {
        await deletePhoneNumber(business.vapiPhoneNumberId);
        steps.push({ name: "vapi-phone-number", status: "ok" });
      } catch (err) {
        steps.push({
          name: "vapi-phone-number",
          status: "failed",
          detail: errMessage(err),
        });
      }
    }
  } else {
    steps.push({ name: "vapi-phone-number", status: "skipped" });
  }

  // Cal.com event type — one per tenant, always safe to delete.
  if (business.calComEventTypeId) {
    const eventTypeId = Number.parseInt(business.calComEventTypeId, 10);
    if (Number.isNaN(eventTypeId)) {
      steps.push({
        name: "cal-event-type",
        status: "skipped",
        detail: `unparseable id: ${business.calComEventTypeId}`,
      });
    } else {
      try {
        await deleteEventType(eventTypeId);
        steps.push({ name: "cal-event-type", status: "ok" });
      } catch (err) {
        steps.push({
          name: "cal-event-type",
          status: "failed",
          detail: errMessage(err),
        });
      }
    }
  } else {
    steps.push({ name: "cal-event-type", status: "skipped" });
  }

  // Twilio number — skip in demo mode (shared resource). twilioSubaccountSid
  // is misnamed historically; it actually holds the IncomingPhoneNumber SID.
  if (business.twilioSubaccountSid) {
    if (demoMode) {
      steps.push({
        name: "twilio-number",
        status: "skipped",
        detail: "demo mode — shared",
      });
    } else {
      try {
        await getTwilioClient()
          .incomingPhoneNumbers(business.twilioSubaccountSid)
          .remove();
        steps.push({ name: "twilio-number", status: "ok" });
      } catch (err) {
        steps.push({
          name: "twilio-number",
          status: "failed",
          detail: errMessage(err),
        });
      }
    }
  } else {
    steps.push({ name: "twilio-number", status: "skipped" });
  }

  // Log the deprovisioning attempt to stdout so it survives the DB cascade.
  // Sentry captures console output as breadcrumbs in production.
  console.info("[deprovision]", { businessId, demoMode, steps });

  // Finally, delete the business — cascades to contacts, calls, messages,
  // appointments, review_requests, events, knowledge_base.
  try {
    await db.delete(businesses).where(eq(businesses.id, businessId));
    steps.push({ name: "delete-business", status: "ok" });
  } catch (err) {
    steps.push({
      name: "delete-business",
      status: "failed",
      detail: errMessage(err),
    });
    return { steps, ok: false };
  }

  return { steps, ok: true };
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
