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
        Don&apos;t use Copper to spam, deceive, harass, or break the law.
        Don&apos;t use Copper for industries that aren&apos;t home services
        without checking with us first. Don&apos;t reverse-engineer the
        service or attempt to access another customer&apos;s data.
      </p>

      <h2>SMS messaging program</h2>
      <p>
        By signing up for Copper, you authorize us to send and receive SMS on
        your behalf to consumers who text your business phone number. This
        includes AI-generated replies to inbound texts, manual replies you
        send through your dashboard, and account notifications we send to
        you about activity on your account.
      </p>
      <p>
        <strong>Consent.</strong> Outbound SMS to your customers is sent only
        in response to a consumer-initiated text. Consumers establish prior
        express consent under TCPA by texting your published business
        number. You must not use Copper to send unsolicited promotional or
        marketing messages.
      </p>
      <p>
        <strong>Opt-out.</strong> Consumers can reply <code>STOP</code>,{" "}
        <code>STOPALL</code>, <code>UNSUBSCRIBE</code>, <code>CANCEL</code>,{" "}
        <code>END</code>, or <code>QUIT</code> to opt out of future
        messages. Replies of <code>HELP</code> or <code>INFO</code> return
        help instructions. Replies of <code>START</code> or{" "}
        <code>UNSTOP</code> re-subscribe. These commands are handled at the
        carrier level and take effect immediately on the consumer&apos;s
        number — the AI cannot continue to message a number that has opted
        out.
      </p>
      <p>
        <strong>Carrier rates.</strong> Standard message and data rates may
        apply to consumers based on their mobile carrier. Copper is not
        responsible for the consumer&apos;s carrier charges.
      </p>
      <p>
        <strong>Deliverability.</strong> SMS deliverability depends on
        carriers (AT&amp;T, Verizon, T-Mobile, and others) and on A2P 10DLC
        registration status with The Campaign Registry. We do not guarantee
        that any individual message will be delivered, and we are not liable
        for messages filtered, delayed, or blocked by carriers.
      </p>
      <p>
        <strong>Your responsibilities.</strong> You agree not to use Copper
        to send messages containing prohibited content (SHAFT — sex, hate,
        alcohol, firearms, tobacco; cannabis; gambling; lending; or other
        carrier-prohibited categories). You agree not to attempt to bypass
        carrier filters or opt-out mechanisms. Violations may result in
        immediate account suspension and reporting to your carrier.
      </p>

      <h2>Service availability</h2>
      <p>
        We aim for 99.5% uptime but don&apos;t guarantee it. Outages can
        happen — at Twilio, Vapi, Supabase, our hosting provider, or on our
        side. We don&apos;t accept liability for missed calls, lost bookings,
        undelivered SMS, or other indirect damages caused by downtime.
      </p>

      <h2>Termination</h2>
      <p>
        You can cancel anytime from your dashboard or by emailing us. We can
        suspend or terminate your account for breach of these terms, abuse,
        non-payment, or use that puts our infrastructure or carrier
        registration at risk.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If we make material changes, we&apos;ll email you at least 30 days
        before they take effect.
      </p>

      <h2>Questions</h2>
      <p>
        Email <a href="mailto:info@joincopper.io">info@joincopper.io</a>.
      </p>
    </MarketingShell>
  );
}
