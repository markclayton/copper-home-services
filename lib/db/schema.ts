import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  pgPolicy,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";

export const businessStatus = pgEnum("business_status", [
  "pending",
  "live",
  "paused",
]);

export const planTier = pgEnum("plan_tier", ["default"]);

export const onboardingStep = pgEnum("onboarding_step", [
  "business",
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
    vapiAssistantId: text(),
    twilioSubaccountSid: text(),
    twilioNumber: text(),
    vapiPhoneNumberId: text(),
    googleReviewUrl: text(),
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
