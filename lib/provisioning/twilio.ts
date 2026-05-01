/**
 * Twilio provisioning: search & buy a local number, set the SMS webhook.
 * Voice is intentionally NOT configured here — Vapi takes ownership of voice
 * once the number is registered with Vapi (see lib/voice/vapi.ts
 * registerPhoneNumber).
 */

import { getTwilioClient } from "@/lib/telephony/twilio";
import { env } from "@/lib/env";

export type BoughtNumber = {
  phoneNumber: string;
  twilioSid: string;
};

export async function buyLocalNumber(args: {
  businessId: string;
  areaCode?: string;
  countryCode?: string;
}): Promise<BoughtNumber> {
  const client = getTwilioClient();
  const country = args.countryCode ?? "US";

  const search = await client
    .availablePhoneNumbers(country)
    .local.list({
      areaCode: args.areaCode ? Number.parseInt(args.areaCode, 10) : undefined,
      smsEnabled: true,
      voiceEnabled: true,
      limit: 5,
    });

  if (search.length === 0) {
    throw new Error(
      `No local numbers available in ${country}${
        args.areaCode ? ` area code ${args.areaCode}` : ""
      }.`,
    );
  }

  const chosen = search[0].phoneNumber;
  const smsUrl = `${env.APP_URL}/api/webhooks/twilio/sms/${args.businessId}`;

  const incoming = await client.incomingPhoneNumbers.create({
    phoneNumber: chosen,
    smsUrl,
    smsMethod: "POST",
  });

  return {
    phoneNumber: incoming.phoneNumber,
    twilioSid: incoming.sid,
  };
}

/**
 * Re-applies our SMS webhook to an already-purchased number. Useful when
 * APP_URL changes (e.g., switching from ngrok to a permanent domain).
 */
export async function refreshNumberWebhooks(args: {
  businessId: string;
  twilioSid: string;
}): Promise<void> {
  const client = getTwilioClient();
  const smsUrl = `${env.APP_URL}/api/webhooks/twilio/sms/${args.businessId}`;
  await client.incomingPhoneNumbers(args.twilioSid).update({ smsUrl, smsMethod: "POST" });
}

/**
 * Attach a phone number to the platform's Messaging Service so SMS sent from
 * it goes through our A2P 10DLC Campaign and isn't carrier-filtered.
 * Idempotent — Twilio returns 409 if the number is already attached, which we
 * silently ignore.
 */
export async function attachToMessagingService(args: {
  twilioSid: string;
  messagingServiceSid: string;
}): Promise<void> {
  const client = getTwilioClient();
  try {
    await client.messaging.v1
      .services(args.messagingServiceSid)
      .phoneNumbers.create({ phoneNumberSid: args.twilioSid });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 409) return; // already attached
    throw err;
  }
}
