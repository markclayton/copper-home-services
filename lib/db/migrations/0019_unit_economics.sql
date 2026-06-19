-- Unit economics (Tier 5A): per-event cost capture for voice minutes,
-- SMS segments, AI tokens, and embedding tokens — the four real provider
-- charges we incur per tenant. Roll-up = per-tenant gross margin.
--
-- Costs are stored as micro-cents (1e-6 of USD) so we can represent
-- per-token unit prices like $3/1M = 0.0003 cents = 300 micro-cents
-- without lossy float math. Total = quantity * unit_price_micro_cents,
-- pre-computed at insert time so reads are simple sums.
--
-- Dedup on (source, source_id) — Vapi resends end-of-call-report, Twilio
-- retries webhooks, Anthropic calls have request IDs we can key on.

CREATE TYPE "public"."unit_event_type" AS ENUM(
  'voice_minute',
  'sms_segment',
  'ai_input_token',
  'ai_output_token',
  'embedding_token'
);--> statement-breakpoint

CREATE TABLE "unit_economics_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "event_type" "unit_event_type" NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "unit_price_micro_cents" numeric(20, 6) NOT NULL,
  "total_micro_cents" numeric(20, 6) NOT NULL,
  "currency" text NOT NULL DEFAULT 'USD',
  "source" text NOT NULL,
  "source_id" text,
  "call_id" uuid REFERENCES "calls"("id") ON DELETE SET NULL,
  "message_id" uuid REFERENCES "messages"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "unit_economics_events_business_created_idx" ON "unit_economics_events" ("business_id", "created_at");--> statement-breakpoint
CREATE INDEX "unit_economics_events_business_type_idx" ON "unit_economics_events" ("business_id", "event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_economics_events_source_unique" ON "unit_economics_events" ("source", "source_id") WHERE "source_id" IS NOT NULL;--> statement-breakpoint

-- RLS on but no SELECT policy — cost data is operator-only. The dashboard
-- shouldn't expose per-event provider costs to tenants. Reads happen via
-- the service role (CLI scripts, internal admin).
ALTER TABLE "unit_economics_events" ENABLE ROW LEVEL SECURITY;
