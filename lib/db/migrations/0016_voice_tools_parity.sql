-- Voice tool parity (Tier 0/1): real transfer_call destination, take_message
-- inbox, and OTP-verified caller-initiated appointment changes.
--
-- The Vapi assistant previously referenced a transfer_to_owner tool that did
-- not exist — see lib/voice/prompt-template.ts:116 before this change. That
-- caused hallucinated tool calls. Adding the real wire here.
--
-- owner_messages is distinct from messages (SMS): the take_message tool
-- captures voicemail-style callbacks that need their own triage state so
-- they don't get lost in the SMS thread.
--
-- appointment_change_verifications gates caller-initiated cancel/reschedule
-- behind a 6-digit OTP we text to the phone on file. Prevents a hostile
-- caller from cancelling someone else's booking by guessing names.

ALTER TABLE "businesses" ADD COLUMN "transfer_number" text;--> statement-breakpoint

CREATE TYPE "public"."owner_message_status" AS ENUM(
  'new',
  'acknowledged',
  'resolved'
);--> statement-breakpoint

CREATE TABLE "owner_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "call_id" uuid REFERENCES "calls"("id") ON DELETE SET NULL,
  "contact_id" uuid REFERENCES "contacts"("id") ON DELETE SET NULL,
  "caller_name" text,
  "caller_phone" text,
  "subject" text,
  "message" text NOT NULL,
  "status" "owner_message_status" NOT NULL DEFAULT 'new',
  "acknowledged_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

ALTER TABLE "owner_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "owners_select_own_owner_messages" ON "owner_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "owners_update_own_owner_messages" ON "owner_messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint

CREATE INDEX "owner_messages_business_status_idx" ON "owner_messages" ("business_id", "status");--> statement-breakpoint

CREATE TABLE "appointment_change_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "appointment_id" uuid NOT NULL REFERENCES "appointments"("id") ON DELETE CASCADE,
  "contact_phone" text NOT NULL,
  "code_hash" text NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone NOT NULL,
  "verified_at" timestamp with time zone,
  "consumed_at" timestamp with time zone,
  "vapi_call_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "appointment_change_verifications_appt_idx" ON "appointment_change_verifications" ("appointment_id");--> statement-breakpoint

-- No RLS policies on appointment_change_verifications: it's tool-only.
-- The Vapi webhook writes/reads it via the service role; nobody in the
-- dashboard ever queries it directly. Enable RLS so accidental client
-- queries fail closed.
ALTER TABLE "appointment_change_verifications" ENABLE ROW LEVEL SECURITY;
