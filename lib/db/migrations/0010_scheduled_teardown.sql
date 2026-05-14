-- Subscription cancellation now pauses the tenant and schedules a teardown
-- N days out instead of immediately releasing the Twilio number. Gives the
-- tenant a grace window to reactivate (e.g., fix a failed card) before we
-- destroy their data + release their phone number.
--
-- A daily Inngest cron scans for businesses where status='paused' AND
-- scheduled_teardown_at <= now() and runs deprovisionTenant on them.

ALTER TABLE "businesses"
  ADD COLUMN "scheduled_teardown_at" timestamp with time zone;

CREATE INDEX "businesses_scheduled_teardown_idx"
  ON "businesses" ("scheduled_teardown_at")
  WHERE "scheduled_teardown_at" IS NOT NULL;
