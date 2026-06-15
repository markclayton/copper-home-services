-- Multi-industry alignment: small businesses outside home services
-- (auto repair, salons, dental/medical, legal) can now self-serve. The
-- voice + SMS prompts adapt to the selected industry, and onboarding
-- captures it in the first step alongside business name + phone.
--
-- Backfilled to 'other_home_services' for every existing row so the
-- prompt has a sensible fallback while the owner reviews their new
-- industry field in Settings. New drafts created after this migration
-- pick during /onboard/business.

CREATE TYPE "public"."industry" AS ENUM(
  'hvac',
  'plumbing',
  'electrical',
  'roofing',
  'pest_control',
  'landscaping',
  'cleaning',
  'garage_doors',
  'handyman',
  'other_home_services',
  'auto_repair',
  'salon_spa',
  'dental_medical',
  'legal_professional',
  'other'
);

ALTER TABLE "businesses" ADD COLUMN "industry" "industry";

UPDATE "businesses" SET "industry" = 'other_home_services' WHERE "industry" IS NULL;
