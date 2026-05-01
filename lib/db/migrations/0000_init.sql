CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."business_status" AS ENUM('pending', 'live', 'paused');--> statement-breakpoint
CREATE TYPE "public"."call_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."call_intent" AS ENUM('emergency', 'service', 'quote', 'billing', 'existing_customer', 'other');--> statement-breakpoint
CREATE TYPE "public"."call_outcome" AS ENUM('booked', 'callback_promised', 'no_booking', 'transferred', 'hung_up');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('in_progress', 'completed', 'failed', 'no_answer', 'voicemail');--> statement-breakpoint
CREATE TYPE "public"."contact_source" AS ENUM('call', 'sms', 'web_form', 'manual');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('queued', 'sent', 'delivered', 'failed', 'undelivered');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('default');--> statement-breakpoint
CREATE TYPE "public"."review_channel" AS ENUM('sms', 'email');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'sent', 'clicked', 'completed');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"contact_id" uuid,
	"call_id" uuid,
	"cal_event_id" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"service_type" text,
	"notes" text,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"owner_name" text NOT NULL,
	"owner_email" text NOT NULL,
	"owner_phone" text NOT NULL,
	"phone_main" text,
	"phone_forwarding" text,
	"service_area_zips" text[],
	"hours" jsonb,
	"cal_com_event_type_id" text,
	"vapi_assistant_id" text,
	"twilio_subaccount_sid" text,
	"twilio_number" text,
	"status" "business_status" DEFAULT 'pending' NOT NULL,
	"plan_tier" "plan_tier" DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"contact_id" uuid,
	"vapi_call_id" text,
	"twilio_call_sid" text,
	"direction" "call_direction" NOT NULL,
	"status" "call_status" DEFAULT 'in_progress' NOT NULL,
	"duration_sec" integer,
	"recording_url" text,
	"transcript" jsonb,
	"summary" text,
	"intent" "call_intent",
	"outcome" "call_outcome",
	"is_emergency" boolean DEFAULT false NOT NULL,
	"appointment_id" uuid,
	"from_number" text,
	"to_number" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calls_vapiCallId_unique" UNIQUE("vapi_call_id")
);
--> statement-breakpoint
ALTER TABLE "calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"phone" text,
	"email" text,
	"name" text,
	"address" text,
	"source" "contact_source",
	"tags" text[],
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"services" jsonb,
	"faqs" jsonb,
	"pricing" jsonb,
	"policies" jsonb,
	"brand_voice_notes" text,
	"emergency_criteria" text,
	"voicemail_script" text,
	"after_hours_policy" text,
	"quote_callback_window" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_base" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"contact_id" uuid,
	"direction" "message_direction" NOT NULL,
	"body" text NOT NULL,
	"twilio_sid" text,
	"status" "message_status" DEFAULT 'queued' NOT NULL,
	"from_number" text,
	"to_number" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_twilioSid_unique" UNIQUE("twilio_sid")
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "review_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"appointment_id" uuid,
	"contact_id" uuid,
	"channel" "review_channel" DEFAULT 'sms' NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"tracking_token" text NOT NULL,
	"sent_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_requests_trackingToken_unique" UNIQUE("tracking_token")
);
--> statement-breakpoint
ALTER TABLE "review_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "owners_select_own_appointments" ON "appointments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "owners_update_own_appointments" ON "appointments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "owners_select_own_business" ON "businesses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("businesses"."owner_user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owners_update_own_business" ON "businesses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("businesses"."owner_user_id" = (select auth.uid())) WITH CHECK ("businesses"."owner_user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owners_select_own_calls" ON "calls" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "owners_select_own_contacts" ON "contacts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "owners_select_own_events" ON "events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "owners_select_own_kb" ON "knowledge_base" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "owners_update_own_kb" ON "knowledge_base" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "owners_select_own_messages" ON "messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "owners_select_own_reviews" ON "review_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));