import { env } from "@/lib/env";
import { formatPhone } from "@/lib/format";

export type AppointmentNotice = {
  businessName: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  whenLocal: string;
  address?: string;
  notes?: string;
  callId: string;
};

export type EmergencyNotice = {
  businessName: string;
  summary: string;
  customerPhone: string;
  address: string;
};

export type CallSummaryNotice = {
  businessName: string;
  customerName?: string | null;
  customerPhone: string;
  ownerLine: string;
  summary: string;
  isEmergency: boolean;
  intent: string | null;
  outcome: string | null;
  callId: string;
};

export type RenderedMessage = {
  sms: string;
  emailSubject: string;
  emailHtml: string;
  emailText: string;
};

function dashboardCallUrl(callId: string): string {
  return `${env.APP_URL}/dashboard/calls/${callId}`;
}

function shell(
  bodyHtml: string,
  options: { accent?: string; ctaUrl?: string; ctaLabel?: string } = {},
): string {
  const accent = options.accent ?? "#0f172a";
  const cta = options.ctaUrl
    ? `<tr><td style="padding-top:24px"><a href="${options.ctaUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:8px">${options.ctaLabel ?? "Open in Copper"} &rarr;</a></td></tr>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <tr><td style="padding:24px 28px 8px 28px">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;font-weight:600">Copper</div>
        </td></tr>
        <tr><td style="padding:0 28px 24px 28px">
          ${bodyHtml}
          <table role="presentation" width="100%"><tr><td>${cta}</td></tr></table>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
          You're receiving this because notifications are enabled for your Copper account.
          <a href="${env.APP_URL}/dashboard/settings" style="color:#475569">Manage notifications</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;font-size:13px;color:#64748b;width:120px;vertical-align:top">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:500">${value}</td>
  </tr>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderAppointment(n: AppointmentNotice): RenderedMessage {
  const url = dashboardCallUrl(n.callId);
  const phoneFmt = formatPhone(n.customerPhone);

  const sms = `New booking: ${n.customerName} • ${n.serviceType} • ${n.whenLocal} • ${phoneFmt}\n${url}`;

  const emailSubject = `New booking — ${n.customerName}, ${n.whenLocal}`;
  const detailsTable = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;border-collapse:collapse">
    ${row("Customer", escape(n.customerName))}
    ${row("Phone", escape(phoneFmt))}
    ${row("Service", escape(n.serviceType))}
    ${row("When", escape(n.whenLocal))}
    ${n.address ? row("Address", escape(n.address)) : ""}
    ${n.notes ? row("Notes", escape(n.notes)) : ""}
  </table>`;

  const html = shell(
    `<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:600">New booking</h1>
    <p style="margin:0;color:#475569;font-size:14px">Your AI just booked an appointment for ${escape(n.businessName)}.</p>
    ${detailsTable}`,
    { ctaUrl: url, ctaLabel: "View call" },
  );

  const text = [
    `New booking — ${n.businessName}`,
    "",
    `Customer: ${n.customerName}`,
    `Phone: ${phoneFmt}`,
    `Service: ${n.serviceType}`,
    `When: ${n.whenLocal}`,
    n.address ? `Address: ${n.address}` : null,
    n.notes ? `Notes: ${n.notes}` : null,
    "",
    `View: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { sms, emailSubject, emailHtml: html, emailText: text };
}

export function renderEmergency(n: EmergencyNotice): RenderedMessage {
  const phoneFmt = formatPhone(n.customerPhone);
  const sms = `🚨 EMERGENCY @ ${n.businessName}: ${n.summary}\nCaller: ${phoneFmt}\nAddress: ${n.address}`;

  const emailSubject = `🚨 Emergency call — ${n.businessName}`;
  const html = shell(
    `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#b91c1c">Emergency</div>
      <div style="font-size:15px;color:#7f1d1d;margin-top:4px">${escape(n.summary)}</div>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      ${row("Caller", escape(phoneFmt))}
      ${row("Address", escape(n.address))}
    </table>
    <p style="margin-top:16px;font-size:13px;color:#475569">The AI told the caller someone will reach back out within minutes.</p>`,
    {
      accent: "#b91c1c",
      ctaUrl: `tel:${n.customerPhone}`,
      ctaLabel: "Call back now",
    },
  );

  const text = [
    `EMERGENCY — ${n.businessName}`,
    "",
    n.summary,
    "",
    `Caller: ${phoneFmt}`,
    `Address: ${n.address}`,
    "",
    "Call back ASAP — the AI told them someone would reach out within minutes.",
  ].join("\n");

  return { sms, emailSubject, emailHtml: html, emailText: text };
}

export type UsageAlertNotice = {
  businessName: string;
  minutesUsed: number;
  minuteCap: number;
  threshold: "warning" | "exceeded";
};

export function renderUsageAlert(n: UsageAlertNotice): RenderedMessage {
  const billingUrl = `${env.APP_URL}/dashboard/billing`;
  const isExceeded = n.threshold === "exceeded";

  const sms = isExceeded
    ? `Heads up — ${n.businessName} hit its monthly voice-minute cap on Copper Solo (${n.minutesUsed}/${n.minuteCap}). Calls are still going through. Upgrade to Business for higher capacity: ${billingUrl}`
    : `${n.businessName} is at ${n.minutesUsed}/${n.minuteCap} voice minutes for the month on Copper Solo. You may hit the cap soon — upgrade to Business if you want headroom: ${billingUrl}`;

  const emailSubject = isExceeded
    ? `You've hit your monthly voice-minute cap — Copper`
    : `Heads up: 80% of your monthly voice minutes used — Copper`;

  const headline = isExceeded
    ? "You've hit your monthly cap."
    : "You're at 80% of your monthly cap.";
  const body = isExceeded
    ? `Calls are still being answered — we don't cut you off mid-month. But Solo is sized for ${n.minuteCap} voice minutes a month, and you've already used ${n.minutesUsed}. If this pace keeps up, Business is the right tier.`
    : `Solo includes ${n.minuteCap} voice minutes a month and you've used ${n.minutesUsed}. You might hit the cap before the cycle resets. Business gives you ~4x the headroom.`;

  const html = shell(
    `<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:600">${headline}</h1>
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.5">${escape(body)}</p>`,
    { ctaUrl: billingUrl, ctaLabel: "Upgrade to Business" },
  );

  const text = [
    headline,
    "",
    body,
    "",
    `Manage your plan: ${billingUrl}`,
  ].join("\n");

  return { sms, emailSubject, emailHtml: html, emailText: text };
}

export type OwnerMessageNotice = {
  businessName: string;
  callerName: string | null;
  callerPhone: string | null;
  subject: string | null;
  message: string;
  callId: string | null;
};

export function renderOwnerMessage(n: OwnerMessageNotice): RenderedMessage {
  const phoneFmt = n.callerPhone ? formatPhone(n.callerPhone) : "(no number)";
  const who = n.callerName ?? phoneFmt;
  const url = n.callId
    ? `${env.APP_URL}/dashboard/calls/${n.callId}`
    : `${env.APP_URL}/dashboard`;

  const sms = `Message from ${who}${n.subject ? ` re: ${n.subject}` : ""}: "${n.message.slice(0, 140)}" • ${phoneFmt}\n${url}`;

  const emailSubject = `Message from ${who}${n.subject ? ` — ${n.subject}` : ""}`;
  const html = shell(
    `<h1 style="margin:0 0 4px 0;font-size:20px;font-weight:600">Message for you</h1>
    <p style="margin:0;color:#475569;font-size:14px">From ${escape(who)} · ${escape(phoneFmt)}${n.subject ? ` · ${escape(n.subject)}` : ""}</p>
    <div style="margin-top:12px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;color:#1e293b;line-height:1.55;white-space:pre-wrap">${escape(n.message)}</div>`,
    { ctaUrl: url, ctaLabel: "Open in dashboard" },
  );

  const text = [
    `Message from ${who}`,
    n.subject ? `Re: ${n.subject}` : null,
    `Phone: ${phoneFmt}`,
    "",
    n.message,
    "",
    `View: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { sms, emailSubject, emailHtml: html, emailText: text };
}

export function renderCallSummary(n: CallSummaryNotice): RenderedMessage {
  const url = dashboardCallUrl(n.callId);
  const phoneFmt = formatPhone(n.customerPhone);
  const who = n.customerName ?? phoneFmt;

  const sms = `${n.ownerLine}\n${url}`;

  const intentLine =
    n.intent && n.outcome
      ? `${n.intent.replace(/_/g, " ")} — ${n.outcome.replace(/_/g, " ")}`
      : n.intent
        ? n.intent.replace(/_/g, " ")
        : null;

  const emailSubject = `Call from ${who}${n.isEmergency ? " — emergency" : ""}`;
  const summaryHtml = `<div style="margin-top:12px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;color:#1e293b;line-height:1.55;white-space:pre-wrap">${escape(n.summary)}</div>`;

  const html = shell(
    `<h1 style="margin:0 0 4px 0;font-size:20px;font-weight:600">Call from ${escape(who)}</h1>
    <p style="margin:0;color:#475569;font-size:14px">${escape(phoneFmt)}${intentLine ? ` · ${escape(intentLine)}` : ""}</p>
    ${summaryHtml}`,
    { ctaUrl: url, ctaLabel: "Open call" },
  );

  const text = [
    `${n.ownerLine}`,
    "",
    n.summary,
    "",
    `Caller: ${phoneFmt}`,
    intentLine ? `Type: ${intentLine}` : null,
    "",
    `View: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { sms, emailSubject, emailHtml: html, emailText: text };
}
