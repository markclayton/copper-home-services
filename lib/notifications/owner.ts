import { db } from "@/lib/db";
import { events, type Business, type NotifyEvent } from "@/lib/db/schema";
import { sendSms } from "@/lib/telephony/twilio";
import { sendEmail, isEmailConfigured } from "./email";
import type { RenderedMessage } from "./templates";

type NotifyOwnerArgs = {
  business: Business;
  event: NotifyEvent;
  message: RenderedMessage;
};

type ChannelResult = "sent" | "skipped" | "failed";

type NotifyOwnerResult = {
  sms: ChannelResult;
  email: ChannelResult;
};

export async function notifyOwner({
  business,
  event,
  message,
}: NotifyOwnerArgs): Promise<NotifyOwnerResult> {
  const channels = business.notifyChannels?.[event] ?? {
    sms: true,
    email: false,
  };

  const result: NotifyOwnerResult = { sms: "skipped", email: "skipped" };

  if (channels.sms && business.ownerPhone) {
    try {
      await sendSms({
        businessId: business.id,
        to: business.ownerPhone,
        body: message.sms,
      });
      result.sms = "sent";
    } catch (err) {
      result.sms = "failed";
      await logFailure(business.id, event, "sms", err);
    }
  }

  if (channels.email && business.ownerEmail && isEmailConfigured()) {
    const sent = await sendEmail({
      to: business.ownerEmail,
      subject: message.emailSubject,
      html: message.emailHtml,
      text: message.emailText,
    });
    if (sent.ok) {
      result.email = "sent";
    } else {
      result.email = "failed";
      await logFailure(business.id, event, "email", sent.reason);
    }
  }

  return result;
}

async function logFailure(
  businessId: string,
  event: NotifyEvent,
  channel: "sms" | "email",
  reason: unknown,
) {
  await db.insert(events).values({
    businessId,
    type: `notify.${event}.${channel}.failed`,
    payload: {
      message: reason instanceof Error ? reason.message : String(reason),
    },
  });
}
