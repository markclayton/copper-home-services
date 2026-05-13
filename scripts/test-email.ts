/**
 * Smoke-test Resend by sending a single email through the same code path
 * that owner notifications use. Useful for verifying your API key, sender
 * domain, and DNS records without triggering the whole call → Inngest →
 * notification flow.
 *
 * Run:  bun scripts/test-email.ts <to-address>
 *   ex: bun scripts/test-email.ts mark.clayton93@gmail.com
 */

import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";
import { env } from "@/lib/env";

async function main() {
  const to = process.argv[2];

  if (!to) {
    console.error("Usage: bun scripts/test-email.ts <to-address>");
    process.exit(1);
  }

  if (!isEmailConfigured()) {
    console.error(
      "RESEND_API_KEY is not set. Add it to .env.local and try again.",
    );
    process.exit(1);
  }

  console.log("Sending test email...");
  console.log(`  From:    ${env.NOTIFICATIONS_EMAIL_FROM ?? "(default)"}`);
  console.log(`  To:      ${to}`);
  console.log("");

  const result = await sendEmail({
    to,
    subject: "Copper test email",
    text: "This is a test email from Copper. If you see this, Resend is wired up correctly.",
    html: `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 18px; margin: 0 0 12px 0;">Copper test email</h1>
        <p style="color: #555; line-height: 1.5;">
          This is a test email from Copper. If you see this, Resend is wired
          up correctly — your API key works, your sender domain is verified,
          and your DNS records are propagating.
        </p>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">
          Sent from <code>scripts/test-email.ts</code>.
        </p>
      </div>
    `,
  });

  if (result.ok) {
    console.log("✓ Sent successfully.");
    console.log(`  Resend message id: ${result.id}`);
    console.log("");
    console.log(
      "Check the recipient's inbox (and spam folder) in the next minute.",
    );
    console.log(
      "You can also watch delivery status at https://resend.com/emails",
    );
    process.exit(0);
  }

  console.error("✗ Send failed.");
  console.error(`  Reason: ${result.reason}`);
  process.exit(1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
