import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  pgPolicy,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";

export const businessStatus = pgEnum("business_status", [
  "pending",
  "live",
  "paused",
]);

export const planTier = pgEnum("plan_tier", [
  "default",
  "solo",
  "business",
  "custom",
]);

export const onboardingStep = pgEnum("onboarding_step", [
  "business",
  "website",
  "services",
  "hours",
  "voice",
  "calendar",
  "number",
  "plan",
  "provisioning",
  "complete",
]);

export const callDirection = pgEnum("call_direction", ["inbound", "outbound"]);

export const callStatus = pgEnum("call_status", [
  "in_progress",
  "completed",
  "failed",
  "no_answer",
  "voicemail",
]);

export const callIntent = pgEnum("call_intent", [
  "emergency",
  "service",
  "quote",
  "billing",
  "existing_customer",
  "other",
]);

export const callOutcome = pgEnum("call_outcome", [
  "booked",
  "callback_promised",
  "no_booking",
  "transferred",
  "hung_up",
]);

export const messageDirection = pgEnum("message_direction", [
  "inbound",
  "outbound",
]);

export const messageSender = pgEnum("message_sender", [
  "customer",
  "ai",
  "owner",
]);

export const messageStatus = pgEnum("message_status", [
  "queued",
  "sent",
  "delivered",
  "failed",
  "undelivered",
]);

export const appointmentStatus = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const reviewChannel = pgEnum("review_channel", ["sms", "email"]);

export const reviewStatus = pgEnum("review_status", [
  "pending",
  "sent",
  "clicked",
  "completed",
]);

export const contactSource = pgEnum("contact_source", [
  "call",
  "sms",
  "web_form",
  "manual",
]);

export const calendarProvider = pgEnum("calendar_provider", [
  "google",
  "microsoft",
]);

export const ownerMessageStatus = pgEnum("owner_message_status", [
  "new",
  "acknowledged",
  "resolved",
]);

export const kbDocumentSource = pgEnum("kb_document_source", [
  "upload",
  "crawl",
  "manual",
]);

export const kbDocumentStatus = pgEnum("kb_document_status", [
  "queued",
  "processing",
  "ready",
  "failed",
]);

export const kbCrawlStatus = pgEnum("kb_crawl_status", [
  "queued",
  "discovering",
  "fetching",
  "embedding",
  "ready",
  "failed",
]);

export const unitEventType = pgEnum("unit_event_type", [
  "voice_minute",
  "sms_segment",
  "ai_input_token",
  "ai_output_token",
  "embedding_token",
]);

export const industry = pgEnum("industry", [
  "hvac",
  "plumbing",
  "electrical",
  "roofing",
  "pest_control",
  "landscaping",
  "cleaning",
  "garage_doors",
  "handyman",
  "other_home_services",
  "auto_repair",
  "salon_spa",
  "dental_medical",
  "legal_professional",
  "other",
]);

const businessOwnerCheck = sql`exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid()))`;

export type NotifyEvent = "appointment" | "emergency" | "callSummary";
export type NotifyChannel = { sms: boolean; email: boolean };
export type NotifyChannels = Record<NotifyEvent, NotifyChannel>;

export const DEFAULT_NOTIFY_CHANNELS: NotifyChannels = {
  appointment: { sms: true, email: true },
  emergency: { sms: true, email: true },
  callSummary: { sms: true, email: false },
};

export const businesses = pgTable(
  "businesses",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerUserId: uuid().references(() => authUsers.id, { onDelete: "set null" }),
    name: text().notNull(),
    timezone: text().notNull().default("America/Los_Angeles"),
    ownerName: text().notNull(),
    ownerEmail: text().notNull(),
    ownerPhone: text().notNull(),
    phoneMain: text(),
    phoneForwarding: text(),
    serviceAreaZips: text().array(),
    hours: jsonb(),
    calendarProvider: calendarProvider(),
    calendarAccountEmail: text(),
    calendarId: text(),
    calendarRefreshTokenEnc: text(),
    calendarAccessTokenEnc: text(),
    calendarTokenExpiresAt: timestamp({ withTimezone: true }),
    calendarConnectedAt: timestamp({ withTimezone: true }),
    desiredPhoneNumber: text(),
    /** Destination for the assistant's transfer_call tool. E.164. When NULL
     *  the tool is omitted from the assistant config entirely so the model
     *  can't even attempt a transfer. */
    transferNumber: text(),
    vapiAssistantId: text(),
    twilioSubaccountSid: text(),
    twilioNumber: text(),
    vapiPhoneNumberId: text(),
    googleReviewUrl: text(),
    /** When false, post-appointment review requests are suppressed — the
     *  AI still texts the customer a thank-you 2h after the job but with
     *  no Google review link. Defaults true so the feature is opt-out. */
    reviewRequestsEnabled: boolean().notNull().default(true),
    voiceId: text().notNull().default("Elliot"),
    notifyChannels: jsonb().$type<NotifyChannels>().notNull().default({
      appointment: { sms: true, email: true },
      emergency: { sms: true, email: true },
      callSummary: { sms: true, email: false },
    }),
    stripeCustomerId: text(),
    stripeSubscriptionId: text(),
    stripeSubscriptionStatus: text(),
    setupFeePaidAt: timestamp({ withTimezone: true }),
    /** When set, an Inngest cron will deprovision this tenant on this date.
     *  Populated when Stripe subscription is canceled (sub.deleted); cleared
     *  if the tenant reactivates inside the grace window. */
    scheduledTeardownAt: timestamp({ withTimezone: true }),
    status: businessStatus().notNull().default("pending"),
    onboardingStep: onboardingStep().notNull().default("business"),
    planTier: planTier().notNull().default("default"),
    industry: industry(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    pgPolicy("owners_select_own_business", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerUserId} = (select auth.uid())`,
    }),
    pgPolicy("owners_update_own_business", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.ownerUserId} = (select auth.uid())`,
      withCheck: sql`${t.ownerUserId} = (select auth.uid())`,
    }),
  ],
).enableRLS();

export const knowledgeBase = pgTable(
  "knowledge_base",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    services: jsonb(),
    faqs: jsonb(),
    pricing: jsonb(),
    policies: jsonb(),
    brandVoiceNotes: text(),
    emergencyCriteria: text(),
    voicemailScript: text(),
    afterHoursPolicy: text(),
    quoteCallbackWindow: text(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("owners_select_own_kb", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
    pgPolicy("owners_update_own_kb", {
      for: "update",
      to: authenticatedRole,
      using: businessOwnerCheck,
      withCheck: businessOwnerCheck,
    }),
  ],
).enableRLS();

export const contacts = pgTable(
  "contacts",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    phone: text(),
    email: text(),
    name: text(),
    address: text(),
    source: contactSource(),
    tags: text().array(),
    aiPaused: boolean().notNull().default(false),
    optedOutAt: timestamp({ withTimezone: true }),
    firstSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("owners_select_own_contacts", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
  ],
).enableRLS();

export const calls = pgTable(
  "calls",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    contactId: uuid().references(() => contacts.id, { onDelete: "set null" }),
    vapiCallId: text().unique(),
    twilioCallSid: text(),
    direction: callDirection().notNull(),
    status: callStatus().notNull().default("in_progress"),
    durationSec: integer(),
    recordingUrl: text(),
    transcript: jsonb(),
    summary: text(),
    intent: callIntent(),
    outcome: callOutcome(),
    isEmergency: boolean().notNull().default(false),
    appointmentId: uuid(),
    fromNumber: text(),
    toNumber: text(),
    startedAt: timestamp({ withTimezone: true }),
    endedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("owners_select_own_calls", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
  ],
).enableRLS();

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    contactId: uuid().references(() => contacts.id, { onDelete: "set null" }),
    direction: messageDirection().notNull(),
    sender: messageSender().notNull().default("ai"),
    body: text().notNull(),
    twilioSid: text().unique(),
    status: messageStatus().notNull().default("queued"),
    fromNumber: text(),
    toNumber: text(),
    sentAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("owners_select_own_messages", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
  ],
).enableRLS();

export const appointments = pgTable(
  "appointments",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    contactId: uuid().references(() => contacts.id, { onDelete: "set null" }),
    callId: uuid().references(() => calls.id, { onDelete: "set null" }),
    calEventId: text(),
    startAt: timestamp({ withTimezone: true }).notNull(),
    endAt: timestamp({ withTimezone: true }).notNull(),
    serviceType: text(),
    notes: text(),
    status: appointmentStatus().notNull().default("scheduled"),
    /** Explicit verbal SMS consent captured by the AI before booking.
     *  When false, no customer-facing SMS (confirmation, reminder, review
     *  request) is sent for this appointment — required for A2P 10DLC
     *  compliance. The call transcript is the audit trail. */
    smsConsent: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("owners_select_own_appointments", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
    pgPolicy("owners_update_own_appointments", {
      for: "update",
      to: authenticatedRole,
      using: businessOwnerCheck,
      withCheck: businessOwnerCheck,
    }),
  ],
).enableRLS();

export const reviewRequests = pgTable(
  "review_requests",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    appointmentId: uuid().references(() => appointments.id, {
      onDelete: "set null",
    }),
    contactId: uuid().references(() => contacts.id, { onDelete: "set null" }),
    channel: reviewChannel().notNull().default("sms"),
    status: reviewStatus().notNull().default("pending"),
    trackingToken: text().notNull().unique(),
    sentAt: timestamp({ withTimezone: true }),
    clickedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("owners_select_own_reviews", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
  ],
).enableRLS();

/**
 * Idempotency log for inbound webhooks. Recorded ON CONFLICT DO NOTHING with
 * unique (provider, eventId) — if the insert returns nothing, we've already
 * processed this event and the handler can return early.
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    provider: text().notNull(),
    eventId: text().notNull(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("webhook_events_provider_event_id_unique").on(t.provider, t.eventId)],
);

export const events = pgTable(
  "events",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    type: text().notNull(),
    payload: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("owners_select_own_events", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
  ],
).enableRLS();

/**
 * Voicemail-style callbacks captured by the assistant's take_message tool.
 * Distinct from messages (SMS) because the dashboard treats these as a
 * triage queue, not a back-and-forth thread. New rows fan out an owner
 * notification via the message/taken Inngest event.
 */
export const ownerMessages = pgTable(
  "owner_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    callId: uuid().references(() => calls.id, { onDelete: "set null" }),
    contactId: uuid().references(() => contacts.id, { onDelete: "set null" }),
    callerName: text(),
    callerPhone: text(),
    subject: text(),
    message: text().notNull(),
    status: ownerMessageStatus().notNull().default("new"),
    acknowledgedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("owners_select_own_owner_messages", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
    pgPolicy("owners_update_own_owner_messages", {
      for: "update",
      to: authenticatedRole,
      using: businessOwnerCheck,
      withCheck: businessOwnerCheck,
    }),
  ],
).enableRLS();

/**
 * OTP gate for caller-initiated cancel/reschedule. The assistant calls
 * send_appointment_change_otp which texts a 6-digit code to the phone on
 * file; verify_appointment_change_otp stamps verifiedAt; cancel/reschedule
 * tools refuse to run on an appointment without a fresh, unconsumed
 * verification row. Code stored as sha256 hash + per-row expiry + attempt
 * counter to defend against brute force.
 *
 * No RLS policies: this table is tool-only. The Vapi webhook runs as the
 * service role; the dashboard never reads it directly.
 */
export const appointmentChangeVerifications = pgTable(
  "appointment_change_verifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    appointmentId: uuid()
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    contactPhone: text().notNull(),
    codeHash: text().notNull(),
    attempts: integer().notNull().default(0),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    verifiedAt: timestamp({ withTimezone: true }),
    consumedAt: timestamp({ withTimezone: true }),
    vapiCallId: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
).enableRLS();

/**
 * Per-utterance transcript segments captured live during a Vapi call.
 * Only finalized transcripts get persisted (partials would 10x the
 * write volume). Read by the dashboard live-transcript polling
 * endpoint while status='in_progress'. After end-of-call-report, the
 * canonical transcript also lives on calls.transcript jsonb; segments
 * win when both are present.
 */
export const callTranscriptSegments = pgTable(
  "call_transcript_segments",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    callId: uuid()
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    role: text().notNull(),
    text: text().notNull(),
    timeOffsetMs: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("call_transcript_segments_call_idx").on(t.callId, t.timeOffsetMs),
    unique("call_transcript_segments_dedupe_unique").on(
      t.callId,
      t.timeOffsetMs,
      t.role,
    ),
    pgPolicy("owners_select_own_call_transcript_segments", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
  ],
).enableRLS();

/**
 * RAG-side knowledge: uploaded documents and crawled website pages. Each
 * row is one "source" — its text gets chunked into kb_chunks and embedded.
 * The structured knowledge_base table is unchanged and still the
 * deterministic facts layer the prompt is built from.
 */
export const kbDocuments = pgTable(
  "kb_documents",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** Set when this row was produced as part of a crawl. NULL for direct
     *  uploads / manual entries. Not a FK to keep deletes simple — orphaned
     *  documents survive a crawl-job purge. */
    crawlJobId: uuid(),
    sourceType: kbDocumentSource().notNull(),
    title: text().notNull(),
    sourceUrl: text(),
    /** SHA-256 hex of the parsed text. Dedupes re-uploads via a partial
     *  unique index on (business_id, content_hash). */
    contentHash: text(),
    status: kbDocumentStatus().notNull().default("queued"),
    error: text(),
    tokenCount: integer().notNull().default(0),
    chunkCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("owners_select_own_kb_documents", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
  ],
).enableRLS();

/**
 * Embedded text chunks. Each chunk belongs to a kb_documents row, and is
 * the unit of semantic retrieval. Vector(1536) matches OpenAI
 * text-embedding-3-small output dimensionality. The HNSW index lives in
 * the migration — Drizzle's index DSL doesn't expose hnsw yet so we use
 * the index() helper here just to declare it; the actual `USING hnsw` is
 * the migration's job.
 *
 * No RLS policies — chunks are tool-only, read/written by server code with
 * the service role.
 */
export const kbChunks = pgTable(
  "kb_chunks",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    documentId: uuid()
      .notNull()
      .references(() => kbDocuments.id, { onDelete: "cascade" }),
    chunkIndex: integer().notNull(),
    content: text().notNull(),
    embedding: vector({ dimensions: 1536 }).notNull(),
    tokenCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("kb_chunks_business_idx").on(t.businessId),
  ],
).enableRLS();

/**
 * Tracks a per-tenant crawl from kickoff to completion so the onboarding
 * UI can poll progress. Owners can see their own row but the crawler
 * writes via service role.
 */
export const kbCrawlJobs = pgTable(
  "kb_crawl_jobs",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    rootUrl: text().notNull(),
    status: kbCrawlStatus().notNull().default("queued"),
    pagesTotal: integer(),
    pagesScraped: integer().notNull().default(0),
    error: text(),
    startedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("owners_select_own_kb_crawl_jobs", {
      for: "select",
      to: authenticatedRole,
      using: businessOwnerCheck,
    }),
  ],
).enableRLS();

/**
 * Per-event provider cost log. One row per billable unit incurred —
 * voice minute, SMS segment, AI input/output token, embedding token.
 * Total in micro-cents (1e-6 USD) to keep token-level prices lossless.
 *
 * No SELECT policy: this is operator-only data, never exposed to
 * tenants. Roll-ups happen via the service role in scripts/admin.
 */
export const unitEconomicsEvents = pgTable(
  "unit_economics_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    eventType: unitEventType().notNull(),
    quantity: numeric({ precision: 20, scale: 6 }).notNull(),
    unitPriceMicroCents: numeric({ precision: 20, scale: 6 }).notNull(),
    totalMicroCents: numeric({ precision: 20, scale: 6 }).notNull(),
    currency: text().notNull().default("USD"),
    /** "vapi" | "twilio" | "anthropic" | "openai" — whichever vendor we paid. */
    source: text().notNull(),
    /** Vendor-supplied id (vapi call id, twilio sid, anthropic request id)
     *  used to dedup if a webhook fires twice or we replay an action. */
    sourceId: text(),
    callId: uuid().references(() => calls.id, { onDelete: "set null" }),
    messageId: uuid().references(() => messages.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
).enableRLS();

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type ReviewRequest = typeof reviewRequests.$inferSelect;
export type Event = typeof events.$inferSelect;
export type OwnerMessage = typeof ownerMessages.$inferSelect;
export type NewOwnerMessage = typeof ownerMessages.$inferInsert;
export type AppointmentChangeVerification =
  typeof appointmentChangeVerifications.$inferSelect;
export type KbDocument = typeof kbDocuments.$inferSelect;
export type NewKbDocument = typeof kbDocuments.$inferInsert;
export type KbChunk = typeof kbChunks.$inferSelect;
export type NewKbChunk = typeof kbChunks.$inferInsert;
export type KbCrawlJob = typeof kbCrawlJobs.$inferSelect;
export type NewKbCrawlJob = typeof kbCrawlJobs.$inferInsert;
export type CallTranscriptSegment = typeof callTranscriptSegments.$inferSelect;
export type NewCallTranscriptSegment =
  typeof callTranscriptSegments.$inferInsert;
export type UnitEconomicsEvent = typeof unitEconomicsEvents.$inferSelect;
export type NewUnitEconomicsEvent = typeof unitEconomicsEvents.$inferInsert;
