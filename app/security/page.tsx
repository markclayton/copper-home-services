import { MarketingShell } from "@/components/marketing/marketing-shell";
import { TERMS_VERSION_LABEL } from "@/lib/legal";

export const metadata = {
  title: "Security · Copper",
  description:
    "Copper's security and data handling practices for business customers doing vendor diligence.",
};

export default function SecurityPage() {
  return (
    <MarketingShell
      title="Security &amp; Data Handling"
      subtitle="What Copper does to protect your data, and what stays with you."
      updated={TERMS_VERSION_LABEL}
    >
      <p className="text-base">
        This page summarizes Copper&apos;s security posture for business
        customers reviewing us as a vendor. For the underlying legal terms
        see our{" "}
        <a href="/terms">Terms of Service</a> and{" "}
        <a href="/privacy">Privacy Policy</a>. Questions:{" "}
        <a href="mailto:info@joincopper.io">info@joincopper.io</a>.
      </p>

      <h2>At a glance</h2>
      <ul>
        <li>US-based hosting on Vercel and Supabase.</li>
        <li>
          Data encrypted in transit (TLS) and at rest (AES-256) end to end.
        </li>
        <li>
          Postgres row-level security isolates each tenant&apos;s data at
          the database layer.
        </li>
        <li>
          No customer data is used to train AI or machine-learning models —
          ours or our providers&apos;.
        </li>
        <li>
          Small US team; production database access is limited to a
          restricted set of authorized engineers.
        </li>
      </ul>

      <h2>Data we handle</h2>
      <p>Copper processes the following categories of data on your behalf:</p>
      <ul>
        <li>
          <strong>Business configuration.</strong> Business name, hours,
          services, pricing ranges, FAQs, brand voice notes, transfer
          number, uploaded knowledge-base documents, and website content
          crawled during onboarding.
        </li>
        <li>
          <strong>Call data.</strong> Inbound call audio, recordings,
          machine-generated transcripts, and post-call summaries.
        </li>
        <li>
          <strong>SMS content.</strong> Text of inbound and outbound SMS
          conversations between callers and the AI or dashboard operator.
        </li>
        <li>
          <strong>Contact records.</strong> Caller phone numbers, names,
          and other details a caller shares during a call or text.
        </li>
        <li>
          <strong>Calendar data.</strong> When Google Calendar is connected,
          the specific event and free/busy scopes described in our privacy
          policy.
        </li>
        <li>
          <strong>Billing.</strong> Stripe manages cardholder data. Copper
          never sees or stores full card numbers.
        </li>
        <li>
          <strong>Application logs.</strong> IP addresses, request paths,
          error traces, and other operational metadata used for debugging
          and abuse prevention.
        </li>
      </ul>

      <h2>Encryption</h2>
      <p>
        <strong>In transit.</strong> All connections to Copper and between
        Copper and our sub-processors travel over TLS. Public browser
        traffic uses TLS 1.2 or higher.
      </p>
      <p>
        <strong>At rest.</strong> Our primary database (Supabase Postgres)
        encrypts data at rest using AES-256. Google OAuth refresh and
        access tokens are additionally encrypted at the application layer
        using AES-256-GCM before being written to the database. The
        application-layer key is stored as an environment secret outside
        the database, so a database compromise alone does not expose
        Google tokens.
      </p>

      <h2>Access controls</h2>
      <ul>
        <li>
          <strong>Tenant isolation.</strong> Postgres row-level security
          policies scope every business record to the business that owns
          it. One customer cannot query another customer&apos;s calls,
          contacts, transcripts, or configuration through the application.
        </li>
        <li>
          <strong>Least privilege at runtime.</strong> The application
          connects to Postgres as a scoped role that respects the RLS
          policies, not as a superuser.
        </li>
        <li>
          <strong>Administrative access.</strong> Production database and
          infrastructure consoles (Supabase, Vercel, Stripe, Twilio, Vapi)
          are accessed only by a small number of authorized team members
          using vendor-managed authentication.
        </li>
        <li>
          <strong>Audit trail.</strong> Application-level actions with
          material impact (deployments, deprovisioning, teardown) are
          logged.
        </li>
      </ul>

      <h2>Sub-processors</h2>
      <p>
        Copper is built on top of established SaaS providers. Each
        sub-processor receives only the data it needs to perform its
        function. Our current sub-processors are Vercel (web hosting),
        Supabase (database and authentication), Twilio (telephony and
        SMS), Vapi (voice AI orchestration and text-to-speech), Anthropic
        (Claude language model), Deepgram (speech-to-text), OpenAI
        (embeddings for knowledge-base search), Stripe (billing), Resend
        (transactional email), and Google (Calendar API, when connected by
        the customer). Each vendor is contractually limited to processing
        data on our behalf. See our{" "}
        <a href="/privacy">Privacy Policy</a> for the full list and what
        each vendor processes.
      </p>

      <h2>AI and model training</h2>
      <p>
        We do not train models on customer data — we don&apos;t operate our
        own foundation models. Our AI providers (Anthropic, OpenAI,
        Deepgram, Vapi) are used under their commercial API terms, which
        prohibit training on customer API traffic without an explicit
        opt-in. We have not opted in and will not.
      </p>

      <h2>Data residency</h2>
      <p>
        Copper&apos;s primary application and database run in US data
        centers operated by Vercel and Supabase. Sub-processors are US
        companies operating US-based infrastructure.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        Our retention windows are documented in the{" "}
        <a href="/privacy">Privacy Policy</a>. In summary: call recordings,
        transcripts, and SMS conversations are deleted within 30 days of
        account cancellation, and remaining account data within 90 days,
        unless we are required to retain something for legal or tax
        purposes. You can request data export or deletion at any time by
        emailing <a href="mailto:info@joincopper.io">info@joincopper.io</a>.
      </p>

      <h2>Backups and continuity</h2>
      <p>
        Our database is hosted on Supabase, which provides managed
        automated backups and point-in-time recovery. We do not currently
        publish a formal recovery time objective (RTO) or recovery point
        objective (RPO) for the self-serve tiers; enterprise commitments
        are available under the Custom tier.
      </p>

      <h2>Incident response</h2>
      <p>
        If we confirm a security incident that affects customer data, we
        will notify affected customers promptly — aiming for notice within
        72 hours of confirmation — with what we know at the time of
        notification and what we are doing about it. Notice will be sent
        to the account owner email on file. To report a suspected incident
        on your side (compromised login, unusual dashboard activity), email{" "}
        <a href="mailto:info@joincopper.io">info@joincopper.io</a> as soon
        as you can.
      </p>

      <h2>Compliance posture</h2>
      <p>
        We&apos;re a small US company operating with practices standard for
        a SaaS product at our current stage. To be direct about what we do
        and don&apos;t hold today:
      </p>
      <ul>
        <li>
          <strong>SOC 2.</strong> We do not hold a SOC 2 report at this
          time.
        </li>
        <li>
          <strong>HIPAA.</strong> Copper is not a HIPAA covered entity or
          business associate at the Solo or Business self-serve tiers. We
          do not sign Business Associate Agreements at self-serve. If your
          use case requires HIPAA compliance, email us about the Custom
          tier before signing up.
        </li>
        <li>
          <strong>PCI DSS.</strong> Cardholder data is handled entirely by
          Stripe. Copper is not in-scope for PCI DSS as we do not receive,
          store, process, or transmit cardholder data.
        </li>
        <li>
          <strong>Telecommunications and SMS.</strong> Consumer SMS is sent
          only after prior express consent (documented in our{" "}
          <a href="/terms">Terms of Service</a>). Opt-out keywords are
          honored at the carrier layer. Copper handles A2P 10DLC brand and
          campaign registration with The Campaign Registry so tenants can
          use business-line SMS immediately.
        </li>
        <li>
          <strong>Google API Services User Data Policy.</strong> Our use of
          Google Workspace data (Calendar) adheres to the Limited Use
          requirements. Details in the Privacy Policy.
        </li>
      </ul>

      <h2>Your responsibilities (shared responsibility)</h2>
      <p>
        Copper secures the platform and the vendor stack underneath it.
        You are responsible for how you use the service and for the
        aspects of security that live on your side of the boundary,
        including:
      </p>
      <ul>
        <li>
          <strong>Account access.</strong> Choosing a strong, unique
          password; keeping login credentials confidential; and not
          sharing dashboard access with anyone who shouldn&apos;t have it.
        </li>
        <li>
          <strong>AI configuration.</strong> The AI represents your
          business based on what you configure — services, pricing, brand
          voice, emergency criteria, transfer policy, uploaded documents,
          and crawled website content. You are responsible for what it
          says on your behalf and for reviewing that content periodically.
        </li>
        <li>
          <strong>Sensitive data in your KB.</strong> Do not upload
          documents containing sensitive personal information (Social
          Security numbers, full payment card numbers, protected health
          information, driver&apos;s license numbers, or the equivalent).
          The knowledge base is designed for public-facing business
          content (service catalogs, policies, FAQ material), not
          confidential records.
        </li>
        <li>
          <strong>Industry-specific compliance.</strong> If your business
          is subject to industry regulation (HIPAA for healthcare, PCI DSS
          for payment card data, GLBA for consumer financial services,
          state-specific privacy laws, professional licensure rules), you
          are responsible for ensuring your use of Copper is compatible
          with those obligations. Ask us before signing up if you have
          doubts.
        </li>
        <li>
          <strong>Caller notice and consent.</strong> Some US states
          require two-party consent for recorded calls. Copper records
          inbound calls by default; you are responsible for ensuring
          appropriate notice to callers based on the jurisdictions where
          you and your callers are located.
        </li>
        <li>
          <strong>SMS content.</strong> You are responsible for ensuring
          your use of the SMS features complies with TCPA, CAN-SPAM, and
          carrier acceptable-use requirements. Prohibited categories are
          listed in our Terms.
        </li>
        <li>
          <strong>Incident notification to us.</strong> If you suspect
          your Copper account has been accessed by someone unauthorized,
          notify us at info@joincopper.io promptly so we can help contain
          it.
        </li>
      </ul>

      <h2>Reporting a vulnerability</h2>
      <p>
        If you discover a security vulnerability in Copper, please report
        it to <a href="mailto:info@joincopper.io">info@joincopper.io</a>{" "}
        with the details we would need to reproduce the issue. We
        appreciate responsible disclosure and will not pursue action
        against good-faith security research that avoids service
        disruption, respects other customers&apos; data, and gives us
        reasonable time to remediate before public disclosure. Do not test
        against production without prior written authorization.
      </p>

      <h2>Questions</h2>
      <p>
        Email <a href="mailto:info@joincopper.io">info@joincopper.io</a>.
        Diligence questionnaires (SIG Lite, CAIQ, custom vendor forms) can
        be sent to the same address — we&apos;ll respond within a
        reasonable timeframe.
      </p>
    </MarketingShell>
  );
}
