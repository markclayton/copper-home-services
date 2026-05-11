import twilio, { type Twilio } from "twilio";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, messages } from "@/lib/db/schema";
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

type SendSmsArgs = {
  businessId: string;
  contactId?: string | null;
  to: string;
  body: string;
  from?: string;
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
  bypassQuota,
}: SendSmsArgs) {
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
  const fromNumber = from ?? env.TWILIO_DEFAULT_FROM_NUMBER;
  if (!fromNumber) {
    throw new Error("No Twilio from-number provided or configured.");
  }

  const sent = await client.messages.create({
    to,
    from: fromNumber,
    body,
  });

  const [row] = await db
    .insert(messages)
    .values({
      businessId,
      contactId: contactId ?? null,
      direction: "outbound",
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
