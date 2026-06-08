-- Tier-aware billing: expand plan_tier from the single legacy "default" to
-- the three self-serve tiers we actually charge for. The Stripe webhook
-- now writes the tier (read from subscription metadata) into businesses,
-- so we can size voice-minute budgets, surface usage in the dashboard,
-- and gate any future tier-specific features off a real column instead of
-- inferring from price ID at every call site.
--
-- "default" is kept so pre-cutover rows don't fail the enum check while
-- the Stripe webhook backfills them on the next subscription event.

ALTER TYPE "plan_tier" ADD VALUE IF NOT EXISTS 'solo';
ALTER TYPE "plan_tier" ADD VALUE IF NOT EXISTS 'business';
ALTER TYPE "plan_tier" ADD VALUE IF NOT EXISTS 'custom';
