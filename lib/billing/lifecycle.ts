/**
 * Subscription lifecycle helpers. Mediates between Stripe subscription
 * status events and our internal businesses.status / scheduled_teardown_at
 * columns.
 *
 * The grace period: when a tenant cancels their subscription, we don't
 * release their Twilio number or wipe their data immediately. We pause the
 * account (dashboard locks), keep the number reserved, and schedule a
 * teardown 14 days out. The tenant can reactivate by re-subscribing
 * inside that window. After the window, a daily Inngest cron runs
 * deprovisionTenant — releases the number, deletes Vapi assistant,
 * revokes Google Calendar, drops the row.
 *
 * Past-due is handled separately: when Stripe can't charge the card, we
 * pause but DON'T schedule teardown. Stripe retries the card for ~3 weeks
 * before flipping the sub to `canceled`, at which point the standard
 * teardown timer kicks in.
 */

export const TEARDOWN_GRACE_DAYS = 14;

/** Stripe subscription statuses that mean "this tenant is paying us". */
export const ACTIVE_STRIPE_STATUSES = new Set([
  "active",
  "trialing",
]);

/** Statuses that mean "billing has a problem" — pause but don't tear down. */
export const PROBLEM_STRIPE_STATUSES = new Set([
  "past_due",
  "unpaid",
  "incomplete",
]);

export function teardownDateFromNow(graceDays = TEARDOWN_GRACE_DAYS): Date {
  return new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);
}
