-- A2P 10DLC compliance: capture explicit verbal SMS consent at booking
-- time. The AI asks "Can I text you a confirmation?" before invoking
-- book_appointment and passes the answer through. Without consent we
-- still create the appointment but suppress ALL customer-facing SMS for
-- its lifecycle (confirmation, arrival reminder, review request).
--
-- Default false on existing rows is safe: those bookings predate the
-- consent flow and the appointment_booked event has already fired by
-- the time this lands, so the SMS gate only affects new bookings.

ALTER TABLE "appointments"
  ADD COLUMN "sms_consent" boolean NOT NULL DEFAULT false;
