-- A2P 10DLC compliance: track when a contact replied STOP / UNSUBSCRIBE /
-- CANCEL / END / QUIT / STOPALL so we suppress outbound SMS before hitting
-- Twilio. Twilio's carriers already block delivery once a recipient has
-- opted out, but suppressing app-side avoids the failed-send (30007)
-- billing, error noise, and futile AI cycles drafting replies that will
-- never go out. The column is cleared when the contact replies START or
-- UNSTOP to re-subscribe.
--
-- NULL = not opted out (default for all existing contacts, which is correct
-- — opt-out state for any pre-migration STOP replies is enforced by the
-- carrier even though we never captured it locally).

ALTER TABLE "contacts"
  ADD COLUMN "opted_out_at" timestamp with time zone;
