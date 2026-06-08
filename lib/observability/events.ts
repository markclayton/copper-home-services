/**
 * Typed product analytics events. One module so renames stay grep-able and
 * the property shape doesn't drift across call sites. Add a new event by
 * extending the union, then exporting a thin wrapper that calls capturePostHog.
 *
 * Convention:
 *   - distinctId is the Supabase user id when known; falls back to business id
 *     for tenant-scoped server events with no clear owner (e.g. inbound call).
 *   - Every event carries businessId in properties so PostHog can filter the
 *     entire funnel by tenant.
 *   - Event names are snake_case past-tense — `appointment_booked` not
 *     `book_appointment` — so cohort/funnel queries read naturally.
 */

import { capturePostHog } from "./posthog";

type BaseProps = {
  businessId: string;
};

type OnboardingStep =
  | "business"
  | "services"
  | "hours"
  | "voice"
  | "calendar"
  | "number"
  | "plan";

export async function trackOnboardingStepCompleted(args: {
  userId: string;
  businessId: string;
  step: OnboardingStep;
}): Promise<void> {
  await capturePostHog({
    distinctId: args.userId,
    event: "onboarding_step_completed",
    properties: { businessId: args.businessId, step: args.step },
  });
}

export async function trackOnboardingCompleted(args: {
  userId: string;
  businessId: string;
}): Promise<void> {
  await capturePostHog({
    distinctId: args.userId,
    event: "onboarding_completed",
    properties: { businessId: args.businessId },
  });
}

export async function trackSubscriptionActivated(args: {
  userId: string | null;
  businessId: string;
  plan: string | null;
}): Promise<void> {
  await capturePostHog({
    distinctId: args.userId ?? args.businessId,
    event: "subscription_activated",
    properties: { businessId: args.businessId, plan: args.plan },
  });
}

export async function trackSubscriptionCanceled(args: {
  userId: string | null;
  businessId: string;
}): Promise<void> {
  await capturePostHog({
    distinctId: args.userId ?? args.businessId,
    event: "subscription_canceled",
    properties: { businessId: args.businessId },
  });
}

export async function trackCallCompleted(args: {
  userId: string | null;
  businessId: string;
  durationSec: number | null;
  intent: string | null;
  outcome: string | null;
  isEmergency: boolean;
}): Promise<void> {
  await capturePostHog({
    distinctId: args.userId ?? args.businessId,
    event: "call_completed",
    properties: {
      businessId: args.businessId,
      durationSec: args.durationSec,
      intent: args.intent,
      outcome: args.outcome,
      isEmergency: args.isEmergency,
    } satisfies BaseProps & Record<string, unknown>,
  });
}

export async function trackAppointmentBooked(args: {
  userId: string | null;
  businessId: string;
  appointmentId: string;
  serviceType: string;
  source: "ai" | "owner";
}): Promise<void> {
  await capturePostHog({
    distinctId: args.userId ?? args.businessId,
    event: "appointment_booked",
    properties: {
      businessId: args.businessId,
      appointmentId: args.appointmentId,
      serviceType: args.serviceType,
      source: args.source,
    },
  });
}

export async function trackUsageWarningFired(args: {
  userId: string | null;
  businessId: string;
  threshold: "warning" | "exceeded";
  minutesUsed: number;
  minuteCap: number;
  tier: string;
}): Promise<void> {
  await capturePostHog({
    distinctId: args.userId ?? args.businessId,
    event: "usage_warning_fired",
    properties: {
      businessId: args.businessId,
      threshold: args.threshold,
      minutesUsed: args.minutesUsed,
      minuteCap: args.minuteCap,
      tier: args.tier,
    },
  });
}
