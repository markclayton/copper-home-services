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
  /** The area code we requested. May be null when no preference was given. */
  requestedAreaCode: string | null;
  /** True when the requested area code had no inventory and we fell back. */
  fellBack: boolean;
  /** True when we tried to buy a specific desired number but couldn't (it
   *  was claimed between the user picking it and provisioning running). */
  desiredNumberUnavailable: boolean;
};

export type AvailableNumber = {
  /** E.164 (e.g. +14155551234). Pass this back as desiredNumber on buy. */
  phoneNumber: string;
  /** Pretty-formatted (e.g. (415) 555-1234) for display. */
  friendlyName: string;
  /** Detected locality. May be the city, just the state, or null. */
  locality: string | null;
  region: string | null;
};

/**
 * List available US local numbers from Twilio. Used by the onboarding wizard
 * so the owner picks a specific number before checkout, instead of being
 * auto-assigned the first available one when provisioning runs.
 */
export async function listAvailableLocalNumbers(args: {
  areaCode?: string;
  countryCode?: string;
  limit?: number;
}): Promise<AvailableNumber[]> {
  const client = getTwilioClient();
  const country = args.countryCode ?? "US";
  const areaCode = args.areaCode
    ? Number.parseInt(args.areaCode, 10)
    : undefined;

  const search = await client.availablePhoneNumbers(country).local.list({
    areaCode,
    smsEnabled: true,
    voiceEnabled: true,
    limit: args.limit ?? 10,
  });

  return search.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality ?? null,
    region: n.region ?? null,
  }));
}

export async function buyLocalNumber(args: {
  businessId: string;
  /** Specific E.164 number the user picked. If still available we buy it
   *  exactly. If not, falls back to areaCode → any-US-local. */
  desiredNumber?: string;
  areaCode?: string;
  countryCode?: string;
}): Promise<BoughtNumber> {
  const client = getTwilioClient();
  const country = args.countryCode ?? "US";
  const preferredAreaCode = args.areaCode
    ? Number.parseInt(args.areaCode, 10)
    : undefined;

  // Try the user's chosen number first if they picked one in the wizard.
  // Twilio doesn't support reservation — between "user picks" and "we buy",
  // another customer could grab it. If so we fall through to area-code
  // search rather than failing the whole flow.
  let desiredNumberUnavailable = false;
  if (args.desiredNumber) {
    const exact = await client.availablePhoneNumbers(country).local.list({
      contains: args.desiredNumber,
      smsEnabled: true,
      voiceEnabled: true,
      limit: 1,
    });
    if (
      exact.length > 0 &&
      exact[0].phoneNumber === args.desiredNumber
    ) {
      const incoming = await purchaseAndConfigure(
        client,
        args.businessId,
        args.desiredNumber,
      );
      return {
        phoneNumber: incoming.phoneNumber,
        twilioSid: incoming.sid,
        requestedAreaCode: args.areaCode ?? null,
        fellBack: false,
        desiredNumberUnavailable: false,
      };
    }
    desiredNumberUnavailable = true;
  }

  let search = await client.availablePhoneNumbers(country).local.list({
    areaCode: preferredAreaCode,
    smsEnabled: true,
    voiceEnabled: true,
    limit: 5,
  });

  // Twilio may have no inventory in a specific area code on a given day.
  // Falling back to "any local in the country" is better than failing the
  // whole provisioning run — the owner can manually pick a different number
  // later if the fallback's area code isn't acceptable.
  let fellBack = false;
  if (search.length === 0 && preferredAreaCode !== undefined) {
    fellBack = true;
    search = await client.availablePhoneNumbers(country).local.list({
      smsEnabled: true,
      voiceEnabled: true,
      limit: 5,
    });
  }

  if (search.length === 0) {
    throw new Error(
      `No local numbers available in ${country}${
        args.areaCode ? ` (tried area code ${args.areaCode} with fallback)` : ""
      }.`,
    );
  }

  const chosen = search[0].phoneNumber;
  const incoming = await purchaseAndConfigure(client, args.businessId, chosen);

  return {
    phoneNumber: incoming.phoneNumber,
    twilioSid: incoming.sid,
    requestedAreaCode: args.areaCode ?? null,
    fellBack,
    desiredNumberUnavailable,
  };
}

async function purchaseAndConfigure(
  client: ReturnType<typeof getTwilioClient>,
  businessId: string,
  phoneNumber: string,
) {
  const smsUrl = `${env.APP_URL}/api/webhooks/twilio/sms/${businessId}`;
  return client.incomingPhoneNumbers.create({
    phoneNumber,
    smsUrl,
    smsMethod: "POST",
  });
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
