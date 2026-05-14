-- Owners can toggle off post-appointment Google review requests. When off,
-- the AI still sends a "thanks for choosing us" SMS 2h after each job but
-- no link is attached and we don't create a review_requests row.

ALTER TABLE "businesses"
  ADD COLUMN "review_requests_enabled" boolean NOT NULL DEFAULT true;
