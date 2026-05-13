import { Mail, MessageSquare, Phone } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata = {
  title: "Contact · Copper",
  description: "Get in touch with the Copper team.",
};

export default function ContactPage() {
  return (
    <MarketingShell
      title="Get in touch"
      subtitle="Real humans, on the other side of the email."
    >
      <p className="text-base">
        We&apos;re a small team. We answer our own support emails — usually
        within a few hours, always within one business day.
      </p>

      <div className="not-prose mt-10 grid sm:grid-cols-2 gap-4">
        <ContactCard
          icon={<Mail size={18} className="text-copper-600" />}
          label="Email"
          value="support@joincopper.io"
          href="mailto:support@joincopper.io"
        />
        <ContactCard
          icon={<MessageSquare size={18} className="text-copper-600" />}
          label="Sales"
          value="sales@joincopper.io"
          href="mailto:sales@joincopper.io"
        />
      </div>

      <h2>What to include</h2>
      <p>
        If you&apos;re reporting a problem with your AI receptionist, it
        speeds things up if you include:
      </p>
      <ul>
        <li>Your business name (or the email you signed up with)</li>
        <li>Roughly when the issue happened</li>
        <li>If it was a specific call — the caller&apos;s phone number</li>
      </ul>

      <h2>Not yet a customer?</h2>
      <p>
        You don&apos;t need to talk to anyone to start — the whole onboarding
        is self-serve at{" "}
        <a href="/onboard">joincopper.io/onboard</a>. But if you&apos;d
        rather have a conversation first, send us a note.
      </p>
    </MarketingShell>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="border border-ink/15 bg-cream-50 rounded-md p-5 flex items-start gap-3 hover:border-copper-300 hover:bg-copper-50/30 transition-colors"
    >
      {icon}
      <div>
        <div className="text-xs uppercase tracking-wider text-ink-500 font-medium">
          {label}
        </div>
        <div className="text-ink font-medium mt-0.5">{value}</div>
      </div>
    </a>
  );
}
