import twilio, { type Twilio } from "twilio";
import { and, count, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, contacts, events, messages } from "@/lib/db/schema";
import { env, requireEnv } from "@/lib/env";

let cached: Twilio | null = null;

export function getTwilioClient(): Twilio {
  if (cached) return cached;
  cached = twilio(
    requireEnv("TWILIO_ACCOUNT_SID"),
    requireEnv("TWILIO_AUTH_TOKEN"),
  );
  return cached;
}

/**
 * Platform-wide ceiling: a single business won't get more than this many
 * outbound SMS in a rolling 30-day window. Tunable via env when we have a
 * customer pushing past it. The point isn't to police usage — it's to stop
 * a runaway loop from draining a thousand dollars in carrier fees before
 * anyone notices.
 */
const SMS_MONTHLY_CAP_DEFAULT = 1000;

export class SmsQuotaExceededError extends Error {
  constructor(
    public businessId: string,
    public count: number,
    public cap: number,
  ) {
    super(
      `SMS monthly quota exceeded for business ${businessId}: ${count}/${cap}`,
    );
    this.name = "SmsQuotaExceededError";
  }
}

/**
 * Thrown when the recipient has previously replied STOP (or equivalent) to
 * this business's number. Twilio's carriers also block the send at their
 * layer, but we check up-front to avoid the failed-send billing and to keep
 * the AI from drafting replies that will never reach the customer.
 */
export class ContactOptedOutError extends Error {
  constructor(
    public businessId: string,
    public toNumber: string,
  ) {
    super(
      `Contact ${toNumber} has opted out of SMS from business ${businessId}.`,
    );
    this.name = "ContactOptedOutError";
  }
}

async function isOptedOut(
  businessId: string,
  toNumber: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        eq(contacts.businessId, businessId),
        eq(contacts.phone, toNumber),
        isNotNull(contacts.optedOutAt),
      ),
    )
    .limit(1);
  return !!row;
}

type SendSmsArgs = {
  businessId: string;
  contactId?: string | null;
  to: string;
  body: string;
  from?: string;
  /** Who sent this message — defaults to "ai" since most outbound is automated.
   * Set to "owner" for manual replies typed in the dashboard. */
  sender?: "ai" | "owner";
  /** Bypass the monthly quota guard. Reserved for owner-targeted alerts where
   * skipping is worse than overspending. Use sparingly. */
  bypassQuota?: boolean;
};

async function withinMonthlyQuota(businessId: string): Promise<{
  ok: boolean;
  count: number;
  cap: number;
}> {
  const cap = Number(env.SMS_MONTHLY_CAP_PER_BUSINESS ?? SMS_MONTHLY_CAP_DEFAULT);
  const thirtyDaysAgo = sql`now() - interval '30 days'`;
  const [row] = await db
    .select({ total: count() })
    .from(messages)
    .where(
      and(
        eq(messages.businessId, businessId),
        eq(messages.direction, "outbound"),
        gte(messages.createdAt, thirtyDaysAgo),
      ),
    );
  const sent = Number(row?.total ?? 0);
  return { ok: sent < cap, count: sent, cap };
}

export async function sendSms({
  businessId,
  contactId,
  to,
  body,
  from,
  sender = "ai",
  bypassQuota,
}: SendSmsArgs) {
  // Opt-out check runs even when bypassQuota is set — owner-targeted alerts
  // never go to customer numbers, so an opt-out should still gate a send to
  // a customer in any edge case where the wrong `to` is passed.
  if (await isOptedOut(businessId, to)) {
    await db.insert(events).values({
      businessId,
      type: "sms.suppressed_opted_out",
      payload: { to },
    });
    throw new ContactOptedOutError(businessId, to);
  }

  if (!bypassQuota) {
    const quota = await withinMonthlyQuota(businessId);
    if (!quota.ok) {
      await db.insert(events).values({
        businessId,
        type: "sms.quota_exceeded",
        payload: { to, count: quota.count, cap: quota.cap },
      });
      throw new SmsQuotaExceededError(businessId, quota.count, quota.cap);
    }
  }

  const client = getTwilioClient();
  // Resolution order:
  //   1. Explicit `from` from the caller (rare — owner replies, scripts)
  //   2. The tenant's own provisioned number (the common case)
  //   3. TWILIO_DEFAULT_FROM_NUMBER (legacy single-tenant fallback)
  let fromNumber = from;
  if (!fromNumber) {
    const [biz] = await db
      .select({ twilioNumber: businesses.twilioNumber })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    fromNumber = biz?.twilioNumber ?? env.TWILIO_DEFAULT_FROM_NUMBER;
  }
  if (!fromNumber) {
    throw new Error(
      `No Twilio from-number resolved for business ${businessId}: tenant has no twilioNumber and TWILIO_DEFAULT_FROM_NUMBER is unset.`,
    );
  }

  // Pass `messagingServiceSid` alongside `from` so Twilio applies the A2P
  // campaign's service-level features (Advanced Opt-Out, sticky sender,
  // smart encoding). The `from` number must already be in the service's
  // sender pool — provisionTenant attaches every newly-bought number via
  // attachToMessagingService.
  const sent = await client.messages.create({
    to,
    from: fromNumber,
    body,
    ...(env.TWILIO_MESSAGING_SERVICE_SID
      ? { messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID }
      : {}),
  });

  const [row] = await db
    .insert(messages)
    .values({
      businessId,
      contactId: contactId ?? null,
      direction: "outbound",
      sender,
      body,
      twilioSid: sent.sid,
      status: mapTwilioStatus(sent.status),
      fromNumber,
      toNumber: to,
      sentAt: new Date(),
    })
    .returning();

  return row;
}

function mapTwilioStatus(
  status: string,
): "queued" | "sent" | "delivered" | "failed" | "undelivered" {
  switch (status) {
    case "queued":
    case "accepted":
    case "scheduled":
    case "sending":
      return "queued";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "failed":
      return "failed";
    case "undelivered":
      return "undelivered";
    default:
      return "queued";
  }
}
