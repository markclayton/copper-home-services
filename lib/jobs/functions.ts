import { randomUUID } from "node:crypto";
import { NonRetriableError } from "inngest";
import { and, asc, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  businesses,
  calls,
  contacts,
  events,
  knowledgeBase,
  messages,
  reviewRequests,
  type Business,
  type KnowledgeBase,
} from "@/lib/db/schema";
import { generateSmsReply, type SmsHistoryMessage } from "@/lib/ai/sms";
import { sendSms } from "@/lib/telephony/twilio";
import { createOutboundCall } from "@/lib/voice/vapi";
import { env } from "@/lib/env";
import {
  inngest,
  type AppointmentBookedData,
  type CallSummaryReadyData,
  type EmergencyDetectedData,
  type LeadFormData,
  type QuoteFollowupData,
  type SmsInboundReceivedData,
  type TenantProvisionNeededData,
} from "./client";
import { provisionTenant } from "@/lib/provisioning";
import { notifyOwner } from "@/lib/notifications/owner";
import {
  renderAppointment,
  renderCallSummary,
  renderEmergency,
} from "@/lib/notifications/templates";
import { recordWebhookEvent } from "@/lib/db/webhook-idempotency";

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
 * new tenant. Calls provisionTenant (idempotent) to buy the Twilio number,
 * register with Vapi, deploy the assistant. When all of that succeeds we
 * flip status=live + onboardingStep=complete so the dashboard gate opens.
 *
 * The setup wait page polls business.status and redirects to /dashboard
 * when it sees "live".
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

    // Provisioning succeeded — flip status to live + onboardingStep to
    // complete so the dashboard gate opens. The setup poller picks this up
    // on its next tick and redirects the user to /dashboard.
    await step.run("activate-tenant", async () => {
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
        payload: { steps: result.steps, trigger: "provisioning.succeeded" },
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

/**
 * appointment/booked → owner notification (SMS + email).
 * Runs alongside reviewRequestFlow which listens to the same event.
 */
export const notifyOwnerAppointmentBooked = inngest.createFunction(
  {
    id: "notify-owner-appointment-booked",
    triggers: [{ event: "appointment/booked" }],
  },
  async ({ event, step }) => {
    const { businessId, appointmentId } = event.data as AppointmentBookedData;

    // Dedupe: Inngest may retry; Vapi may resend; tool handlers may double-fire.
    // First writer wins.
    const fresh = await step.run("claim-notification-lock", () =>
      recordWebhookEvent("notification", `appointment:${appointmentId}`),
    );
    if (!fresh) return { skipped: "already notified for this appointment" };

    const ctx = await step.run("load-context", async () => {
      const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
      if (!biz) return null;

      const [appt] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);
      if (!appt) return null;

      let contactName: string | null = null;
      let contactPhone: string | null = null;
      if (appt.contactId) {
        const [c] = await db
          .select({ name: contacts.name, phone: contacts.phone })
          .from(contacts)
          .where(eq(contacts.id, appt.contactId))
          .limit(1);
        contactName = c?.name ?? null;
        contactPhone = c?.phone ?? null;
      }
      return { biz, appt, contactName, contactPhone };
    });

    if (!ctx) return { skipped: "missing business or appointment" };
    const { biz, appt, contactName, contactPhone } = ctx;
    const business = biz as unknown as Business;

    const whenLocal = new Intl.DateTimeFormat("en-US", {
      timeZone: business.timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(appt.startAt));

    const message = renderAppointment({
      businessName: business.name,
      customerName: contactName ?? "Caller",
      customerPhone: contactPhone ?? "",
      serviceType: appt.serviceType ?? "Service visit",
      whenLocal,
      notes: appt.notes ?? undefined,
      callId: appt.callId ?? "",
    });

    const result = await step.run("notify", () =>
      notifyOwner({ business, event: "appointment", message }),
    );
    return { ok: true, ...result };
  },
);

/**
 * emergency/detected → loud owner notification (SMS + email, with red banner).
 * Fired from the Vapi tool handler when the AI calls send_emergency_alert.
 */
export const notifyOwnerEmergency = inngest.createFunction(
  {
    id: "notify-owner-emergency",
    triggers: [{ event: "emergency/detected" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const data = event.data as EmergencyDetectedData;

    // Dedupe per Vapi call so an emergency alert only fires once even if
    // the AI calls the tool twice in the same call.
    if (data.vapiCallId) {
      const fresh = await step.run("claim-notification-lock", () =>
        recordWebhookEvent("notification", `emergency:${data.vapiCallId}`),
      );
      if (!fresh) return { skipped: "already notified for this emergency" };
    }

    const business = await step.run("load-business", async () => {
      const [b] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, data.businessId))
        .limit(1);
      return b ?? null;
    });
    if (!business) {
      throw new NonRetriableError(`business ${data.businessId} not found`);
    }

    const businessRow = business as unknown as Business;
    const message = renderEmergency({
      businessName: businessRow.name,
      summary: data.summary,
      customerPhone: data.customerPhone,
      address: data.address,
    });

    const result = await step.run("notify", () =>
      notifyOwner({ business: businessRow, event: "emergency", message }),
    );
    return { ok: true, ...result };
  },
);

/**
 * call/summary-ready → owner notification with the LLM-generated ownerLine
 * and full summary. Fired from the Vapi end-of-call-report webhook after
 * the call row is summarized.
 */
export const notifyOwnerCallSummary = inngest.createFunction(
  {
    id: "notify-owner-call-summary",
    triggers: [{ event: "call/summary-ready" }],
  },
  async ({ event, step }) => {
    const { businessId, callId, ownerLine: ownerLineFromEvent } =
      event.data as CallSummaryReadyData;

    // Dedupe: end-of-call-report from Vapi can be resent.
    const fresh = await step.run("claim-notification-lock", () =>
      recordWebhookEvent("notification", `call_summary:${callId}`),
    );
    if (!fresh) return { skipped: "already notified for this call" };

    const ctx = await step.run("load-context", async () => {
      const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
      if (!biz) return null;

      const [call] = await db
        .select()
        .from(calls)
        .where(eq(calls.id, callId))
        .limit(1);
      if (!call) return null;

      let contactName: string | null = null;
      if (call.contactId) {
        const [c] = await db
          .select({ name: contacts.name })
          .from(contacts)
          .where(eq(contacts.id, call.contactId))
          .limit(1);
        contactName = c?.name ?? null;
      }
      return { biz, call, contactName };
    });

    if (!ctx) return { skipped: "missing business or call" };
    const { biz, call, contactName } = ctx;
    const business = biz as unknown as Business;

    if (!call.summary) return { skipped: "no summary on call" };

    const ownerLine =
      ownerLineFromEvent ??
      `Call from ${contactName ?? call.fromNumber ?? "unknown"}: ${call.summary.slice(0, 100)}`;

    const message = renderCallSummary({
      businessName: business.name,
      customerName: contactName,
      customerPhone: call.fromNumber ?? "",
      ownerLine,
      summary: call.summary,
      isEmergency: call.isEmergency,
      intent: call.intent,
      outcome: call.outcome,
      callId: call.id,
    });

    const result = await step.run("notify", () =>
      notifyOwner({ business, event: "callSummary", message }),
    );
    return { ok: true, ...result };
  },
);

/**
 * sms/inbound-received → generate AI reply and send it via Twilio.
 *
 * Fired from the Twilio inbound-SMS webhook AFTER the message row is
 * persisted. Idempotent on twilioSid via webhook_events. If the LLM
 * decides the conversation needs a human touch (urgent issue, callback
 * request, complex question), we also fire an emergency or quote-style
 * owner notification so the owner sees it.
 */
export const respondToInboundSms = inngest.createFunction(
  {
    id: "respond-to-inbound-sms",
    triggers: [{ event: "sms/inbound-received" }],
    retries: 2,
    concurrency: { limit: 5, key: "event.data.businessId" },
  },
  async ({ event, step }) => {
    const data = event.data as SmsInboundReceivedData;

    // Dedupe: Twilio can resend webhooks; Inngest can retry steps.
    const fresh = await step.run("claim-reply-lock", () =>
      recordWebhookEvent("sms_reply", data.twilioSid),
    );
    if (!fresh) return { skipped: "already replied to this inbound" };

    const ctx = await step.run("load-context", async () => {
      const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, data.businessId))
        .limit(1);
      if (!biz) return null;

      const [kb] = await db
        .select()
        .from(knowledgeBase)
        .where(eq(knowledgeBase.businessId, data.businessId))
        .limit(1);

      // Find the contact for this phone number so we can scope history.
      const [contact] = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.businessId, data.businessId),
            eq(contacts.phone, data.fromNumber),
          ),
        )
        .limit(1);

      // Pull recent conversation context (excluding the message we just got —
      // it's passed separately as the live turn).
      let history: SmsHistoryMessage[] = [];
      if (contact) {
        const rows = await db
          .select({
            direction: messages.direction,
            body: messages.body,
          })
          .from(messages)
          .where(
            and(
              eq(messages.businessId, data.businessId),
              eq(messages.contactId, contact.id),
            ),
          )
          .orderBy(asc(messages.createdAt))
          .limit(40);
        history = rows;
        // Drop the most recent inbound — it's the same as data.body.
        const last = history[history.length - 1];
        if (last?.direction === "inbound" && last.body === data.body) {
          history = history.slice(0, -1);
        }
      }

      return { biz, kb, contact, history };
    });

    if (!ctx) {
      throw new NonRetriableError(`business ${data.businessId} not found`);
    }
    const business = ctx.biz as unknown as Business;
    const kb = (ctx.kb ?? null) as unknown as KnowledgeBase | null;

    if (ctx.contact?.aiPaused) {
      await step.run("log-paused", async () => {
        await db.insert(events).values({
          businessId: data.businessId,
          type: "sms.ai_paused_skipped",
          payload: {
            messageId: data.messageId,
            fromNumber: data.fromNumber,
            customerMessage: data.body,
          },
        });
      });
      return { skipped: "ai paused for this contact" };
    }

    const reply = await step.run("generate-reply", () =>
      generateSmsReply({
        business,
        kb,
        history: ctx.history,
        newMessage: data.body,
      }),
    );

    await step.run("send-reply", () =>
      sendSms({
        businessId: data.businessId,
        contactId: ctx.contact?.id ?? null,
        to: data.fromNumber,
        body: reply.body,
      }),
    );

    if (reply.flagForOwner && reply.flagReason) {
      await step.run("notify-owner", async () => {
        await db.insert(events).values({
          businessId: data.businessId,
          type: "sms.flagged_for_owner",
          payload: {
            messageId: data.messageId,
            fromNumber: data.fromNumber,
            reason: reply.flagReason,
            customerMessage: data.body,
            aiReply: reply.body,
          },
        });
        // Best-effort owner SMS — quota-checked like any other.
        await sendSms({
          businessId: data.businessId,
          to: business.ownerPhone,
          body: `Text from ${data.fromNumber}: "${data.body.slice(0, 80)}" — AI flagged this for you. ${reply.flagReason}`,
        }).catch(() => {
          // Owner alert is best-effort; the event row above is the source of truth.
        });
      });
    }

    return { ok: true, replied: true, flagged: reply.flagForOwner };
  },
);
