-- Number selection moves into the wizard right before checkout, and the
-- actual Twilio purchase moves behind the Stripe webhook so we don't burn
-- money on numbers for users who never complete checkout.

ALTER TABLE "businesses" ADD COLUMN "desired_phone_number" text;

-- New "number" step sits between "calendar" and "plan". Order in the enum
-- matters for any code that does ordinal comparisons (lib/onboarding's
-- STEP_ORDER uses string compare via the JS array, not this ordering, but
-- aligning them keeps mental models simple).
ALTER TYPE "onboarding_step" ADD VALUE IF NOT EXISTS 'number' BEFORE 'plan';
