import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata = {
  title: "Privacy · Copper",
  description: "How Copper collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <MarketingShell
      title="Privacy Policy"
      subtitle="What we collect, why, and what we do with it."
      updated="May 2026"
    >
      <p className="text-base">
        This is a working draft of our privacy policy. We&apos;ll have it
        reviewed by counsel before we&apos;re open to the general public. If
        you have a question that isn&apos;t covered, email{" "}
        <a href="mailto:support@joincopper.com">support@joincopper.com</a>.
      </p>

      <h2>The short version</h2>
      <p>
        We collect what we need to run the AI receptionist on your behalf —
        your business details, your callers&apos; phone numbers and call
        transcripts, and your billing info. We don&apos;t sell your data. We
        don&apos;t train AI models on your call transcripts.
      </p>

      <h2>What we collect</h2>
      <h3>From you, the business owner</h3>
      <p>
        Name, email, phone number, business name, hours, services, pricing,
        and anything else you put into onboarding or settings. Payment
        information is handled by Stripe — we never see your full card number.
      </p>
      <h3>From your callers</h3>
      <p>
        Their phone number (from caller ID), the audio and transcript of their
        call, and any information they share during the conversation (name,
        address, the issue they&apos;re calling about).
      </p>
      <h3>From your use of the app</h3>
      <p>
        Standard things — IP address, browser type, pages visited. We use this
        to debug and improve the product.
      </p>

      <h2>What we do with it</h2>
      <ul>
        <li>
          Run the AI receptionist: take calls, book appointments, send SMS,
          show you what happened in your dashboard.
        </li>
        <li>
          Send you notifications via SMS and email when something happens that
          you should know about.
        </li>
        <li>Bill you and handle support requests.</li>
        <li>Improve the product (in aggregate — never your individual data).</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>
        We share data with the vendors we use to operate the service: Twilio
        (telephony and SMS), Vapi (voice AI), Resend (email), Stripe (billing),
        Supabase (database hosting), Vercel (web hosting), Cal.com (calendar
        booking), and OpenRouter (call summarization). Each is bound by their
        own privacy commitments.
      </p>
      <p>
        We don&apos;t sell your data. We don&apos;t share it with advertisers.
      </p>

      <h2>How long we keep it</h2>
      <p>
        For as long as your account is active. If you cancel, we delete your
        call recordings and transcripts within 30 days and your account data
        within 90 days — unless we&apos;re required to retain something for
        legal or tax purposes.
      </p>

      <h2>Your rights</h2>
      <p>
        You can export your data or delete your account at any time by
        emailing <a href="mailto:support@joincopper.com">support@joincopper.com</a>.
        We&apos;ll respond within 7 days.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we make material changes, we&apos;ll email you before they take
        effect.
      </p>
    </MarketingShell>
  );
}
