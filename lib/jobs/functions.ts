import { randomUUID } from "node:crypto";
import { NonRetriableError } from "inngest";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  businesses,
  calls,
  contacts,
  events,
  reviewRequests,
} from "@/lib/db/schema";
import { sendSms } from "@/lib/telephony/twilio";
import { createOutboundCall } from "@/lib/voice/vapi";
import { env } from "@/lib/env";
import {
  inngest,
  type AppointmentBookedData,
  type LeadFormData,
  type QuoteFollowupData,
  type TenantProvisionNeededData,
} from "./client";
import { provisionTenant } from "@/lib/provisioning";

/**
 * Speed-to-lead: a website form POST → outbound AI call within ~60 s.
 * V1 = single attempt. Multi-attempt retry (PRD Flow 2) is V1.5.
 */
export const outboundLeadCall = inngest.createFunction(
  {
    id: "outbound-lead-call",
    triggers: [{ event: "lead/web-form-submitted" }],
    retries: 2,
  },
  async ({ event, step }) => {
    const { businessId, phone, name, email, service, message, sourceUrl } =
      event.data as LeadFormData;

    const business = await step.run("load-business", async () => {
      const [b] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
      if (!b) throw new NonRetriableError(`business ${businessId} not found`);
      return b;
    });

    if (!business.vapiAssistantId || !business.vapiPhoneNumberId) {
      await step.run("log-skipped", async () => {
        await db.insert(events).values({
          businessId,
          type: "lead.outbound.skipped_unconfigured",
          payload: event.data as Record<string, unknown>,
        });
      });
      return { skipped: "vapi not configured for this tenant" };
    }

    await step.run("upsert-contact", async () => {
      const [existing] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(eq(contacts.businessId, businessId), eq(contacts.phone, phone)),
        )
        .limit(1);

      if (existing) {
        await db
          .update(contacts)
          .set({
            lastSeenAt: new Date(),
            name: name ?? null,
            email: email ?? null,
          })
          .where(eq(contacts.id, existing.id));
        return existing.id;
      }
      const [created] = await db
        .insert(contacts)
        .values({
          businessId,
          phone,
          name: name ?? null,
          email: email ?? null,
          source: "web_form",
        })
        .returning({ id: contacts.id });
      return created.id;
    });

    const call = await step.run("create-vapi-call", () =>
      createOutboundCall({
        phoneNumberId: business.vapiPhoneNumberId!,
        assistantId: business.vapiAssistantId!,
        customerNumber: phone,
        customerName: name,
        metadata: { source: "web_form_lead", service, message, sourceUrl },
      }),
    );

    await step.run("log-call-created", async () => {
      await db.insert(events).values({
        businessId,
        type: "lead.outbound.call_created",
        payload: {
          vapiCallId: call.id,
          ...(event.data as Record<string, unknown>),
        },
      });
    });

    return { vapiCallId: call.id };
  },
);

/**
 * Post-job review request: end_at + 2h → tracked SMS → 48h wait → nudge if
 * unclicked → another 48h → mark complete.
 */
export const reviewRequestFlow = inngest.createFunction(
  {
    id: "review-request-flow",
    triggers: [{ event: "appointment/booked" }],
  },
  async ({ event, step }) => {
    const { businessId, appointmentId, contactId, endAt } =
      event.data as AppointmentBookedData;

    const fireAt = new Date(
      new Date(endAt).getTime() + 2 * 60 * 60 * 1000,
    ).toISOString();
    await step.sleepUntil("wait-until-after-job", fireAt);

    const ctx = await step.run("load-context", async () => {
      const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
      let phone: string | null = null;
      if (contactId) {
        const [c] = await db
          .select({ phone: contacts.phone })
          .from(contacts)
          .where(eq(contacts.id, contactId))
          .limit(1);
        phone = c?.phone ?? null;
      }
      return { businessName: biz?.name, phone };
    });

    if (!ctx.phone || !ctx.businessName) {
      return { skipped: "no phone or business" };
    }

    const token = randomUUID().replace(/-/g, "");

    const reviewId = await step.run("create-review-row", async () => {
      const [r] = await db
        .insert(reviewRequests)
        .values({
          businessId,
          appointmentId,
          contactId,
          channel: "sms",
          status: "pending",
          trackingToken: token,
        })
        .returning({ id: reviewRequests.id });
      return r.id;
    });

    await step.run("send-review-sms", async () => {
      const url = `${env.APP_URL}/r/${token}`;
      await sendSms({
        businessId,
        contactId,
        to: ctx.phone!,
        body: `Thanks for choosing ${ctx.businessName}! If we did right by you, would you leave a quick Google review? ${url}`,
      });
      await db
        .update(reviewRequests)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(reviewRequests.id, reviewId));
    });

    await step.sleep("wait-for-click", "48h");

    const stillUnclicked = await step.run("check-clicked", async () => {
      const [r] = await db
        .select({ status: reviewRequests.status })
        .from(reviewRequests)
        .where(eq(reviewRequests.id, reviewId))
        .limit(1);
      return r?.status === "sent";
    });

    if (!stillUnclicked) return { completedEarly: true };

    await step.run("send-nudge", async () => {
      const url = `${env.APP_URL}/r/${token}`;
      await sendSms({
        businessId,
        contactId,
        to: ctx.phone!,
        body: `Quick reminder — if ${ctx.businessName} did right by you, would you mind leaving a Google review? ${url}`,
      });
    });

    await step.sleep("wait-final", "48h");

    await step.run("mark-complete-by-timeout", async () => {
      await db
        .update(reviewRequests)
        .set({ status: "completed", completedAt: new Date() })
        .where(
          and(
            eq(reviewRequests.id, reviewId),
            sql`${reviewRequests.status} != 'completed'`,
          ),
        );
    });

    return { ok: true };
  },
);

/**
 * Owner daily digest: hourly cron that finds tenants where local hour == 18
 * and sends a one-line SMS recap of today's activity.
 */
export const dailyDigest = inngest.createFunction(
  {
    id: "daily-digest",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const liveTenants = await step.run("load-live-tenants", () =>
      db.select().from(businesses).where(eq(businesses.status, "live")),
    );

    const now = new Date();
    const targetHour = 18;

    const targets = liveTenants.filter((b) => {
      try {
        const hourStr = new Intl.DateTimeFormat("en-US", {
          timeZone: b.timezone,
          hour: "numeric",
          hour12: false,
        }).format(now);
        return Number.parseInt(hourStr, 10) === targetHour;
      } catch {
        return false;
      }
    });

    for (const business of targets) {
      await step.run(`digest-${business.id}`, async () => {
        const todayStart = sql`date_trunc('day', now() AT TIME ZONE ${business.timezone})`;
        const callCreatedLocal = sql`(${calls.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${business.timezone}`;
        const apptCreatedLocal = sql`(${appointments.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${business.timezone}`;
        const reviewCreatedLocal = sql`(${reviewRequests.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${business.timezone}`;

        const [callStats] = await db
          .select({
            total: count(),
            emergencies:
              sql<number>`count(*) filter (where ${calls.isEmergency})`.as(
                "emergencies",
              ),
          })
          .from(calls)
          .where(
            and(
              eq(calls.businessId, business.id),
              gte(callCreatedLocal, todayStart),
            ),
          );

        const [bookedStats] = await db
          .select({ total: count() })
          .from(appointments)
          .where(
            and(
              eq(appointments.businessId, business.id),
              gte(apptCreatedLocal, todayStart),
            ),
          );

        const [reviewStats] = await db
          .select({ total: count() })
          .from(reviewRequests)
          .where(
            and(
              eq(reviewRequests.businessId, business.id),
              gte(reviewCreatedLocal, todayStart),
            ),
          );

        const totalCalls = callStats?.total ?? 0;
        const booked = bookedStats?.total ?? 0;
        const conversion =
          totalCalls > 0 ? Math.round((booked / totalCalls) * 100) : 0;
        const emergencies = Number(callStats?.emergencies ?? 0);
        const reviews = reviewStats?.total ?? 0;

        const dashboardUrl = `${env.APP_URL}/dashboard`;
        const body = `Today: ${totalCalls} calls, ${booked} booked (${conversion}%), ${emergencies} emergencies, ${reviews} reviews requested. ${dashboardUrl}`;

        try {
          await sendSms({
            businessId: business.id,
            to: business.ownerPhone,
            body,
          });
        } catch (err) {
          await db.insert(events).values({
            businessId: business.id,
            type: "daily_digest.failed",
            payload: {
              message: err instanceof Error ? err.message : String(err),
            },
          });
        }
      });
    }

    return { tenantsNotified: targets.length };
  },
);

/**
 * Self-serve tenant activation: runs after Stripe checkout completes for a
 * new tenant. Calls provisionTenant (idempotent), then flips status to live.
 * The setup wait page polls business.status and redirects when it changes.
 */
export const tenantProvisioning = inngest.createFunction(
  {
    id: "tenant-provisioning",
    triggers: [{ event: "tenant/provision-needed" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { businessId } = event.data as TenantProvisionNeededData;

    const result = await step.run("provision-tenant", () =>
      provisionTenant(businessId),
    );

    if (!result.ok) {
      await step.run("log-failure", async () => {
        await db.insert(events).values({
          businessId,
          type: "tenant.provision.failed",
          payload: { steps: result.steps },
        });
      });
      throw new NonRetriableError(
        `Provisioning failed: ${result.steps
          .filter((s) => s.status === "failed")
          .map((s) => `${s.name}: ${s.detail}`)
          .join("; ")}`,
      );
    }

    // Provisioning succeeded — but the tenant only goes "live" after payment.
    // The Stripe checkout.session.completed webhook is what flips status.
    // This function just makes sure the technical infrastructure is wired up
    // so the plan-step UI can display the reserved phone number.
    await step.run("log-provisioned", async () => {
      await db.insert(events).values({
        businessId,
        type: "tenant.provisioned",
        payload: { steps: result.steps },
      });
    });

    return { ok: true, businessId };
  },
);

/**
 * tool/quote-followup → owner SMS reminder to call the customer back.
 * Simpler than the PRD's "schedule callback task" — just nudge the owner.
 */
export const quoteFollowupReminder = inngest.createFunction(
  {
    id: "quote-followup-reminder",
    triggers: [{ event: "tool/quote-followup" }],
  },
  async ({ event, step }) => {
    const { businessId, details, customerPhone, customerName } =
      event.data as QuoteFollowupData;

    const business = await step.run("load-business", async () => {
      const [b] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
      return b;
    });
    if (!business) return { skipped: "business not found" };

    await step.run("send-owner-sms", () =>
      sendSms({
        businessId,
        to: business.ownerPhone,
        body: `Quote callback needed: ${customerName ?? "Caller"} (${customerPhone}) — ${details}`,
      }),
    );

    return { ok: true };
  },
);
