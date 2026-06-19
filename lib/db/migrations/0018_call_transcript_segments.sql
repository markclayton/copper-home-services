-- Live transcript (Tier 4A): per-utterance rows captured from Vapi's
-- transcript event stream during a call, so the dashboard can show what
-- the caller is saying in real time instead of waiting for end-of-call.
--
-- Only FINAL transcripts get persisted — partials would multiply writes
-- 10x without adding value to the polling readers. The webhook handler
-- dedupes on (call_id, time_offset_ms) so Vapi resends don't double-up.
--
-- The existing calls.transcript jsonb stays as the canonical artifact
-- written by end-of-call-report; segments are the live-during-call
-- source of truth and supersede the jsonb when both are present.

CREATE TABLE "call_transcript_segments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "call_id" uuid NOT NULL REFERENCES "calls"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "text" text NOT NULL,
  "time_offset_ms" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "call_transcript_segments_call_idx" ON "call_transcript_segments" ("call_id", "time_offset_ms");--> statement-breakpoint
CREATE UNIQUE INDEX "call_transcript_segments_dedupe_unique" ON "call_transcript_segments" ("call_id", "time_offset_ms", "role");--> statement-breakpoint

ALTER TABLE "call_transcript_segments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "owners_select_own_call_transcript_segments" ON "call_transcript_segments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));
