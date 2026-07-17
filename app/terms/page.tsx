import { MarketingShell } from "@/components/marketing/marketing-shell";
import { TERMS_VERSION_LABEL } from "@/lib/legal";

export const metadata = {
  title: "Terms · Copper",
  description: "Terms of service for Copper.",
};

export default function TermsPage() {
  return (
    <MarketingShell
      title="Terms of Service"
      subtitle="The agreement between you and Copper."
      updated={TERMS_VERSION_LABEL}
    >
      <p className="text-base">
        By using Copper you agree to the terms below.
      </p>

      <h2>Acceptance</h2>
      <p>
        By creating an account and checking the &quot;I agree&quot; box during
        signup, you agreed to these Terms of Service as of the date recorded
        on your account. If you don&apos;t agree to any part of these terms,
        don&apos;t create an account or use the service. If you&apos;re
        agreeing on behalf of a business or other entity, you represent that
        you have authority to bind that entity to these terms.
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

      <h2>Fees and financial responsibility</h2>
      <p>
        Copper is offered in self-serve tiers (Solo at $79/month, Business at
        $249/month) and a Custom tier for multi-location operations and
        integrations (quoted directly). Subscriptions are billed monthly via
        Stripe starting on the day you sign up. There&apos;s no setup fee on
        the self-serve tiers. Fees are non-refundable except where required
        by law. You can cancel anytime; cancellations take effect at the end
        of the current billing period and you won&apos;t be charged again.
      </p>
      <p>
        You are financially responsible for all activity on your account,
        including subscription fees, overage charges above your plan&apos;s
        included voice minutes and SMS allowances, and pass-through
        third-party costs for telephony, SMS, and voice AI providers
        (Twilio, Vapi, and others). Standard passthrough costs typically run
        under $20/month, but your actual charges depend on your usage. If we
        can&apos;t collect a payment, we may suspend your service until the
        balance is settled.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use Copper to spam, deceive, harass, or break the law.
        Copper is built for small businesses — currently home services,
        auto repair, salons and spas, dental and medical practices, and
        legal or professional services. If your business doesn&apos;t fit
        one of these, email{" "}
        <a href="mailto:support@joincopper.io">support@joincopper.io</a>{" "}
        before setting up so we can confirm it&apos;s a fit. Don&apos;t
        reverse-engineer the service or attempt to access another
        customer&apos;s data.
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
        after the consumer has established prior express consent. Consent is
        established when the consumer either (a) sends an inbound text to
        your published business number, or (b) calls your business number
        and verbally agrees, on the recorded call, to receive a confirmation
        or follow-up text after the AI explicitly asks permission. The
        consent moment is captured in the call transcript and retained as
        audit evidence. You must not use Copper to send unsolicited
        promotional or marketing messages.
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

      <h2>Your responsibility for AI output and brand</h2>
      <p>
        You configure the AI receptionist — the voice, the FAQs, the
        services list, the emergency criteria, the after-hours policy, the
        transfer number, and everything in your knowledge base. The AI
        answers callers based on that configuration and the tools you
        enable. You own how the AI represents your business.
      </p>
      <p>You are solely responsible for:</p>
      <ul>
        <li>What your callers experience on the phone with the AI.</li>
        <li>
          Any impact of the AI&apos;s behavior on your brand, reputation,
          customer relationships, or third-party goodwill.
        </li>
        <li>
          Reviewing call transcripts and adjusting the AI&apos;s
          configuration as needed.
        </li>
      </ul>
      <p>
        Copper is not responsible for caller experience, brand impact,
        customer complaints, lost bookings, missed leads, or any
        reputational consequences arising from the AI&apos;s operation on
        your behalf.
      </p>

      <h2>Warranties and disclaimers</h2>
      <p>
        Copper is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot;
        without warranties of any kind, express or implied. We do not
        warrant that the service will be uninterrupted, error-free, secure,
        or that it will meet your specific requirements. We do not warrant
        any particular caller experience, uptime level, transcription
        accuracy, booking accuracy, SMS deliverability, or business outcome.
      </p>
      <p>
        We aim for 99.5% uptime but don&apos;t guarantee it. Outages can
        happen — at Twilio, Vapi, Supabase, our hosting provider, or on our
        side.
      </p>
      <p>
        To the maximum extent permitted by law, we disclaim all implied
        warranties, including merchantability, fitness for a particular
        purpose, and non-infringement.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Copper&apos;s total
        aggregate liability arising out of or related to these terms or
        your use of the service — whether in contract, tort, or otherwise —
        will not exceed the total amount you paid us in the twelve (12)
        months preceding the event giving rise to the claim.
      </p>
      <p>
        In no event will Copper be liable for any indirect, incidental,
        special, consequential, exemplary, or punitive damages; lost
        profits, lost revenue, lost business opportunity, lost goodwill, or
        reputational harm; or the cost of substitute services — even if
        we&apos;ve been advised of the possibility of such damages. These
        limitations apply even if a remedy fails of its essential purpose.
      </p>

      <h2>Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold harmless Copper, its
        officers, employees, and agents from and against any third-party
        claim, demand, loss, or expense (including reasonable attorney fees)
        arising out of or related to: (a) your use of the service, (b) your
        violation of these terms, (c) content or configuration you provide
        to the service, (d) the AI&apos;s behavior on calls made on your
        behalf, or (e) your violation of any law or third-party right,
        including telecommunications and consumer protection laws.
      </p>

      <h2>Termination</h2>
      <p>
        You can cancel your subscription anytime from your dashboard or by
        emailing us. Cancellations take effect at the end of the current
        billing period.
      </p>
      <p>
        We may suspend or terminate your account at our discretion, at any
        time, with or without cause, and with reasonable notice — or
        immediately without notice for breach of these terms, non-payment,
        abuse of the service, activity that puts our infrastructure or
        carrier registration at risk, or where required by law. On
        termination, we may delete your data after a reasonable period.
      </p>

      <h2>Governing law and disputes</h2>
      <p>
        These Terms and any dispute arising out of or related to them or the
        service are governed by the laws of the State of Texas, without
        regard to its conflict-of-laws principles. Any dispute will be
        brought exclusively in the state or federal courts sitting in Texas,
        and you and Copper consent to the personal jurisdiction of those
        courts.
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
