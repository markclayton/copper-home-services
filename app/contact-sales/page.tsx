import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ContactSalesForm } from "@/components/marketing/contact-sales-form";

export const metadata = {
  title: "Custom plan · Copper",
  description:
    "Multi-location, custom integrations, or hands-on setup? Tell us a bit about your operation and we'll be in touch.",
};

export default function ContactSalesPage() {
  return (
    <MarketingShell
      title="Custom plan"
      subtitle="For multi-location operations and custom integrations. Tell us a bit about what you need — we'll reply within one business day."
    >
      <p className="text-base">
        Most home services businesses fit cleanly into Solo or Business. The
        Custom plan is for operations that need something the self-serve tiers
        don&apos;t cover — multiple locations under one roof, integrations with
        FieldEdge, ServiceTitan, or Housecall Pro, or hands-on setup and
        training for a larger team.
      </p>

      <div className="not-prose mt-10">
        <ContactSalesForm />
      </div>

      <p className="text-sm text-ink-500 mt-8">
        Prefer email? Reach us at{" "}
        <a href="mailto:info@joincopper.io">info@joincopper.io</a>.
      </p>
    </MarketingShell>
  );
}
