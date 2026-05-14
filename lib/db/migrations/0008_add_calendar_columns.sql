CREATE TYPE "calendar_provider" AS ENUM ('google', 'microsoft');

ALTER TABLE "businesses"
  ADD COLUMN "calendar_provider" "calendar_provider",
  ADD COLUMN "calendar_account_email" text,
  ADD COLUMN "calendar_id" text,
  ADD COLUMN "calendar_refresh_token_enc" text,
  ADD COLUMN "calendar_access_token_enc" text,
  ADD COLUMN "calendar_token_expires_at" timestamp with time zone,
  ADD COLUMN "calendar_connected_at" timestamp with time zone;

-- Cal.com is being ripped out in favor of direct calendar integrations
-- (Google Calendar first, Microsoft Outlook later). The event-type ID lived
-- in Mark's personal Cal.com account, so it has no value for migrated rows.
ALTER TABLE "businesses" DROP COLUMN "cal_com_event_type_id";

-- New skippable step in the onboarding wizard: connect a calendar. Slots
-- in between voice and plan so the AI can be linked to the owner's calendar
-- before the plan / Stripe checkout step.
ALTER TYPE "onboarding_step" ADD VALUE IF NOT EXISTS 'calendar' BEFORE 'plan';
