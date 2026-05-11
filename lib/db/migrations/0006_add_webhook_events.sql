CREATE TABLE "webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" text NOT NULL,
  "event_id" text NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "webhook_events_provider_event_id_unique" UNIQUE ("provider", "event_id")
);

CREATE INDEX IF NOT EXISTS "webhook_events_provider_idx" ON "webhook_events" ("provider");
