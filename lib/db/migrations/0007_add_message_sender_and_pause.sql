CREATE TYPE "message_sender" AS ENUM ('customer', 'ai', 'owner');

ALTER TABLE "messages" ADD COLUMN "sender" "message_sender";

-- Backfill existing rows. Old data is approximate but useful — every existing
-- outbound row was sent by the AI/system, and every inbound came from a
-- customer. STOP/HELP replies from Twilio's carrier layer never persisted to
-- our table, so we don't need a separate category for those.
UPDATE "messages"
SET "sender" = CASE WHEN "direction" = 'inbound' THEN 'customer'::message_sender ELSE 'ai'::message_sender END
WHERE "sender" IS NULL;

ALTER TABLE "messages" ALTER COLUMN "sender" SET NOT NULL;
ALTER TABLE "messages" ALTER COLUMN "sender" SET DEFAULT 'ai';

ALTER TABLE "contacts" ADD COLUMN "ai_paused" boolean NOT NULL DEFAULT false;
