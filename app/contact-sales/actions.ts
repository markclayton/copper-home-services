"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/notifications/email";
import { reportError } from "@/lib/observability";

const SALES_INBOX = "info@joincopper.io";

const schema = z.object({
  email: z.string().email("Enter a valid email so we can reply."),
  company: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  message: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
});

export type ContactSalesState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; error: string };

export async function submitContactSales(
  _prev: ContactSalesState,
  form: FormData,
): Promise<ContactSalesState> {
  const parsed = schema.safeParse({
    email: form.get("email"),
    company: form.get("company"),
    message: form.get("message"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Invalid submission.",
    };
  }

  const { email, company, message } = parsed.data;
  const subject = `Custom plan inquiry — ${company ?? email}`;
  const lines = [
    `New Custom-plan inquiry from joincopper.io/contact-sales`,
    ``,
    `Email:    ${email}`,
    `Company:  ${company ?? "(not provided)"}`,
    ``,
    `Message:`,
    message ?? "(not provided)",
  ];
  const text = lines.join("\n");
  const html = [
    `<p><strong>New Custom-plan inquiry</strong> from <code>joincopper.io/contact-sales</code></p>`,
    `<p><strong>Email:</strong> <a href="mailto:${email}">${email}</a><br/>`,
    `<strong>Company:</strong> ${company ? escapeHtml(company) : "<em>not provided</em>"}</p>`,
    `<p><strong>Message:</strong></p>`,
    `<p>${message ? escapeHtml(message).replace(/\n/g, "<br/>") : "<em>not provided</em>"}</p>`,
  ].join("");

  const result = await sendEmail({
    to: SALES_INBOX,
    subject,
    html,
    text,
  });

  if (!result.ok) {
    reportError(new Error(`contact-sales email failed: ${result.reason}`), {
      tags: { surface: "contact-sales" },
      extra: { email },
    });
    return {
      status: "error",
      error:
        "We couldn't send your note just now. Email info@joincopper.io directly and we'll follow up.",
    };
  }

  return { status: "ok" };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
