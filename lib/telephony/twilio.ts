import twilio, { type Twilio } from "twilio";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
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

type SendSmsArgs = {
  businessId: string;
  contactId?: string | null;
  to: string;
  body: string;
  from?: string;
};

export async function sendSms({
  businessId,
  contactId,
  to,
  body,
  from,
}: SendSmsArgs) {
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
