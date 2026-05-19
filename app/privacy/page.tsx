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
        <a href="mailto:info@joincopper.io">info@joincopper.io</a>.
      </p>

      <h2>The short version</h2>
      <p>
        We collect what we need to run the AI receptionist on your behalf —
        your business details, your callers&apos; phone numbers and call
        transcripts, and your billing info. We don&apos;t sell your data. We
        don&apos;t share phone numbers with advertisers. We don&apos;t train
        AI models on your call transcripts, and we do not use any Google
        Workspace data (including Google Calendar) to develop, improve, or
        train any AI or machine learning models. Google OAuth tokens are
        encrypted at rest with AES-256-GCM.
      </p>

      <h2>What we collect</h2>
      <h3>From you, the business owner</h3>
      <p>
        Name, email, phone number, business name, hours, services, pricing,
        and anything else you put into onboarding or settings. Payment
        information is handled by Stripe — we never see your full card number.
      </p>
      <h3>From your callers and texters</h3>
      <p>
        Their phone number (from caller ID or the SMS header), the audio and
        transcript of their call, the text of their SMS messages, and any
        information they share during the conversation (name, address, the
        issue they&apos;re calling about).
      </p>
      <h3>From your use of the app</h3>
      <p>
        Standard things — IP address, browser type, pages visited. We use this
        to debug and improve the product.
      </p>

      <h2>Google Workspace data (Google Calendar)</h2>
      <p>
        When you connect a Google Calendar, Copper requests two OAuth scopes
        and only those scopes:
      </p>
      <ul>
        <li>
          <code>https://www.googleapis.com/auth/calendar.events</code> — used to
          create booking events on the calendar you authorize, and to read or
          update those events if a caller reschedules or cancels.
        </li>
        <li>
          <code>https://www.googleapis.com/auth/calendar.freebusy</code> — used
          to check your busy times before offering a slot to a caller.
        </li>
      </ul>
      <p>
        We use Google Calendar data only for those two purposes: showing your
        availability to callers, and writing the booking back to your
        calendar. We do not read attendee emails, event descriptions, or any
        other event content beyond what is necessary to perform these
        operations. We do not share Google Workspace data with any third
        party for advertising, analytics, profiling, or any purpose unrelated
        to delivering the calendar-booking feature.
      </p>
      <p>
        <strong>Data protection.</strong> We apply the following safeguards to
        Google Workspace data:
      </p>
      <ul>
        <li>
          <strong>Encryption at rest:</strong> Google OAuth refresh and access
          tokens are encrypted using AES-256-GCM before being written to our
          database. The encryption key is stored as an environment secret
          outside the database, so a database compromise alone does not
          expose tokens.
        </li>
        <li>
          <strong>Encryption in transit:</strong> All requests to Google APIs,
          to Copper, and between Copper and its vendors travel over TLS
          (HTTPS).
        </li>
        <li>
          <strong>Database encryption:</strong> Our primary database (Supabase
          Postgres) encrypts data at rest using AES-256 and is hosted in a
          private network behind authenticated access.
        </li>
        <li>
          <strong>Access controls:</strong> Row-level security policies in our
          database scope every row of business data to the business that owns
          it, so one customer cannot read another customer&apos;s calendar
          tokens or booking history. Production access is restricted to a
          small number of authorized engineers and audited.
        </li>
        <li>
          <strong>Minimum necessary scope:</strong> We do not request, and
          will not request, the broader{" "}
          <code>https://www.googleapis.com/auth/calendar</code> scope or any
          Workspace scope (Gmail, Drive, Contacts, etc.) we do not need.
        </li>
        <li>
          <strong>Revocation:</strong> You can disconnect Google Calendar at
          any time from your Copper dashboard. We revoke the OAuth tokens
          with Google and delete the encrypted tokens from our database
          immediately. You can also revoke access directly at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
          >
            myaccount.google.com/permissions
          </a>
          .
        </li>
      </ul>
      <p>
        Copper&apos;s use and transfer of information received from Google APIs
        to any other app adheres to the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>

      <h2>Artificial intelligence and machine learning</h2>
      <p>
        Copper is an AI-powered receptionist. It uses third-party AI services
        — we do not train or operate our own foundation models. The AI
        providers we currently use are:
      </p>
      <ul>
        <li>
          <strong>Anthropic</strong> (Claude Haiku 4.5) — generates the
          receptionist&apos;s spoken replies and decides when to use tools
          (book an appointment, send an SMS, transfer the call).
        </li>
        <li>
          <strong>Deepgram</strong> — converts caller audio into text
          (speech-to-text).
        </li>
        <li>
          <strong>Vapi</strong> — orchestrates the voice session and synthesizes
          the AI&apos;s spoken replies (text-to-speech).
        </li>
        <li>
          <strong>OpenRouter</strong> — routes occasional summarization and
          background language tasks to LLMs.
        </li>
      </ul>
      <p>
        <strong>
          We do not use Google Workspace data, including any data obtained
          from Google APIs, to develop, improve, or train any generalized or
          non-personalized AI or machine learning models.
        </strong>{" "}
        Calendar event data is used solely at request-time to check
        availability and write a booking — it is never sent into a training
        pipeline.
      </p>
      <p>
        Our AI providers are bound by their own privacy and data-handling
        terms, which prohibit using customer data passed through their APIs
        for training their own models without explicit opt-in. We have not
        opted in. We do not send Google Workspace content (event titles,
        descriptions, attendees, or any other fields beyond the busy/free
        information needed to operate the booking flow) to any AI provider.
      </p>

      <h2>SMS messaging</h2>
      <p>
        When you text a phone number associated with a business using Copper,
        your message and the business&apos;s reply are transmitted via SMS
        through our service. The reply may be generated by an AI assistant
        operating on the business&apos;s behalf or sent manually by the
        business owner.
      </p>
      <p>
        <strong>Consent.</strong> We don&apos;t send unsolicited SMS. Every
        outbound message is sent in direct response to an inbound text
        initiated by the consumer, or as an account notification to a
        business owner about activity on their own account. Business
        owners&apos; SMS notifications can be disabled in account settings at
        any time.
      </p>
      <p>
        <strong>Opt-out.</strong> Reply <code>STOP</code> to any text from a
        number operated through Copper to unsubscribe. Reply <code>HELP</code>{" "}
        for help. Reply <code>START</code> to re-subscribe after opting out.
        These commands are handled at the carrier level and take effect
        immediately.
      </p>
      <p>
        <strong>Carrier rates.</strong> Standard message and data rates from
        your mobile carrier may apply to messages you send to and receive
        from numbers operated through Copper. Message frequency varies based
        on the conversation.
      </p>
      <p>
        <strong>No resale of phone numbers.</strong> We never sell, rent, or
        share phone numbers with third parties for marketing purposes. Mobile
        opt-in data and consent records are not shared with third parties or
        affiliates for marketing or promotional purposes.
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
        We share data with the vendors we use to operate the service, and only
        the data each vendor needs to do its job:
      </p>
      <ul>
        <li>
          <strong>Twilio</strong> — telephony and SMS infrastructure (phone
          numbers, call audio, SMS message bodies).
        </li>
        <li>
          <strong>Vapi</strong> — voice AI orchestration and text-to-speech
          (call audio, AI prompts, AI responses).
        </li>
        <li>
          <strong>Anthropic</strong> — large language model for the AI
          receptionist (call turn-by-turn text and the business&apos;s
          configured prompt; not Google Workspace data).
        </li>
        <li>
          <strong>Deepgram</strong> — speech-to-text (call audio only).
        </li>
        <li>
          <strong>OpenRouter</strong> — background summarization (call
          transcripts; not Google Workspace data).
        </li>
        <li>
          <strong>Stripe</strong> — billing and payment processing.
        </li>
        <li>
          <strong>Resend</strong> — transactional email delivery.
        </li>
        <li>
          <strong>Supabase</strong> — database and authentication hosting
          (primary application data, encrypted at rest).
        </li>
        <li>
          <strong>Vercel</strong> — web hosting and serverless compute.
        </li>
        <li>
          <strong>Google</strong> — calendar booking (only when you connect
          Google Calendar; see the Google Workspace section above for the
          exact scopes and protections).
        </li>
      </ul>
      <p>
        Each vendor is bound by its own privacy and security commitments and
        is contractually limited to processing data on our behalf. We don&apos;t
        sell your data. We don&apos;t share it with advertisers. We don&apos;t
        share phone numbers, calendar data, or any other personal information
        with anyone outside the vendors listed above.
      </p>

      <h2>How long we keep it</h2>
      <p>
        For as long as your account is active. If you cancel, we delete your
        call recordings, transcripts, and SMS conversations within 30 days
        and your account data within 90 days — unless we&apos;re required to
        retain something for legal or tax purposes. If you disconnect Google
        Calendar, the encrypted OAuth tokens are deleted from our database
        immediately and our access is revoked with Google.
      </p>

      <h2>Your rights</h2>
      <p>
        You can export your data or delete your account at any time by
        emailing <a href="mailto:info@joincopper.io">info@joincopper.io</a>.
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
