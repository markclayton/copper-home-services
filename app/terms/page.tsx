import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata = {
  title: "Terms · Copper",
  description: "Terms of service for Copper.",
};

export default function TermsPage() {
  return (
    <MarketingShell
      title="Terms of Service"
      subtitle="The agreement between you and Copper."
      updated="May 2026"
    >
      <p className="text-base">
        This is a working draft. We&apos;ll have it reviewed by counsel
        before opening to the general public. By using Copper you agree to
        the terms below.
      </p>

      <h2>What Copper does</h2>
      <p>
        Copper provides an AI receptionist service that answers your business
        phone, takes messages, books appointments, sends SMS, and surfaces
        what happened in your dashboard. You give us your business details
        and authorize us to act as a receptionist on your behalf.
      </p>

      <h2>Your account</h2>
      <p>
        You must be authorized to set up phone and SMS infrastructure for the
        business you sign up. You&apos;re responsible for keeping your login
        credentials secret. You&apos;re responsible for whatever your AI
        receptionist says on your behalf — it&apos;s configured from the
        information you provide.
      </p>

      <h2>Pricing and billing</h2>
      <p>
        Copper costs $500/month, billed monthly via Stripe starting on the
        day you sign up. There&apos;s no setup fee. Carrier costs for SMS and
        outbound calls are passed through at cost (typically under $20/month).
        You can cancel anytime; cancellations take effect at the end of the
        current billing period and you won&apos;t be charged again.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use Copper to spam, deceive, harass, or break the law. Don&apos;t use
        Copper for industries that aren&apos;t home services without
        checking with us first. Don&apos;t reverse-engineer the service or
        attempt to access another customer&apos;s data.
      </p>

      <h2>SMS compliance</h2>
      <p>
        You authorize Copper to send SMS on your behalf to your customers
        related to their service inquiries (appointment confirmations, missed
        call follow-ups, review requests). Customers can reply STOP to opt
        out at any time, which is handled automatically.
      </p>

      <h2>Service availability</h2>
      <p>
        We aim for 99.5% uptime but don&apos;t guarantee it. Outages can
        happen — at Twilio, Vapi, Supabase, our hosting provider, or on our
        side. We don&apos;t accept liability for missed calls, lost bookings,
        or other indirect damages caused by downtime.
      </p>

      <h2>Termination</h2>
      <p>
        You can cancel anytime from your dashboard or by emailing us. We can
        suspend or terminate your account for breach of these terms, abuse,
        non-payment, or use that puts our infrastructure at risk.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If we make material changes, we&apos;ll email you at least 30 days
        before they take effect.
      </p>

      <h2>Questions</h2>
      <p>
        Email <a href="mailto:support@joincopper.com">support@joincopper.com</a>.
      </p>
    </MarketingShell>
  );
}
