import { Resend } from "resend";
import { env } from "@/lib/env";

let cached: Resend | null = null;

function getResend(): Resend | null {
  if (cached) return cached;
  if (!env.RESEND_API_KEY) return null;
  cached = new Resend(env.RESEND_API_KEY);
  return cached;
}

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: string };

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const client = getResend();
  if (!client) return { ok: false, reason: "email_not_configured" };

  const from =
    args.from ??
    env.NOTIFICATIONS_EMAIL_FROM ??
    "Copper AI <hello@notifications.joincopper.io>";

  const result = await client.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });

  if (result.error) {
    return { ok: false, reason: result.error.message };
  }
  return { ok: true, id: result.data?.id ?? "" };
}

export function isEmailConfigured(): boolean {
  return !!env.RESEND_API_KEY;
}
