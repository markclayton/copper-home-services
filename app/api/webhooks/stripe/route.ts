import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { businesses, events } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";
import { inngest } from "@/lib/jobs/client";

export async function POST(req: NextRequest) {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `signature verification failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
      );
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
      );
      break;
    case "invoice.payment_failed":
      await logInvoiceEvent(
        event.data.object as Stripe.Invoice,
        "stripe.invoice.payment_failed",
      );
      break;
    case "invoice.paid":
      await logInvoiceEvent(
        event.data.object as Stripe.Invoice,
        "stripe.invoice.paid",
      );
      break;
    default:
      // ignore unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}

async function findBusinessByCustomer(customerId: string) {
  const [row] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.stripeCustomerId, customerId))
    .limit(1);
  return row ?? null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const businessId =
    (session.metadata?.businessId as string | undefined) ??
    (await businessIdFromCustomer(session.customer));
  if (!businessId) return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const flow = session.metadata?.flow as string | undefined;

  await db
    .update(businesses)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      setupFeePaidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, businessId));

  await db.insert(events).values({
    businessId,
    type: "stripe.checkout.completed",
    payload: { sessionId: session.id, subscriptionId, flow },
  });

  if (flow === "new_tenant") {
    await activateNewTenant(businessId);
  }
}

/**
 * New-tenant payment success. The auth user already exists (signed up before
 * starting the wizard) and provisioning ran in the background after step 4.
 * This handler just flips the business to live + complete so the dashboard
 * gate opens.
 *
 * If provisioning failed earlier or the user paid before it finished, we
 * re-fire the Inngest event — provisionTenant is idempotent so it'll either
 * pick up the failed step or skip everything cleanly.
 */
async function activateNewTenant(businessId: string) {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (!business) return;

  await db
    .update(businesses)
    .set({
      status: "live",
      onboardingStep: "complete",
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, businessId));

  await db.insert(events).values({
    businessId,
    type: "tenant.live",
    payload: { trigger: "stripe.checkout.completed" },
  });

  // Safety net: re-fire provisioning if anything's missing. Idempotent.
  if (!business.twilioNumber || !business.vapiAssistantId) {
    await inngest.send({
      name: "tenant/provision-needed",
      data: { businessId },
    });
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const business = await findBusinessByCustomer(customerId);
  if (!business) return;

  await db
    .update(businesses)
    .set({
      stripeSubscriptionId: sub.id,
      stripeSubscriptionStatus: sub.status,
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  await db.insert(events).values({
    businessId: business.id,
    type: "stripe.subscription.updated",
    payload: { subscriptionId: sub.id, status: sub.status },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const business = await findBusinessByCustomer(customerId);
  if (!business) return;

  await db
    .update(businesses)
    .set({
      stripeSubscriptionStatus: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  await db.insert(events).values({
    businessId: business.id,
    type: "stripe.subscription.deleted",
    payload: { subscriptionId: sub.id },
  });
}

async function logInvoiceEvent(invoice: Stripe.Invoice, type: string) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
  if (!customerId) return;
  const business = await findBusinessByCustomer(customerId);
  if (!business) return;
  await db.insert(events).values({
    businessId: business.id,
    type,
    payload: {
      invoiceId: invoice.id,
      amount: invoice.amount_paid ?? invoice.amount_due,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    },
  });
}

async function businessIdFromCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  if (!customer) return null;
  const customerId = typeof customer === "string" ? customer : customer.id;
  const business = await findBusinessByCustomer(customerId);
  return business?.id ?? null;
}
