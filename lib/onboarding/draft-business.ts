import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  businesses,
  knowledgeBase,
  type Business,
  type KnowledgeBase,
} from "@/lib/db/schema";
import { isEmailAllowlisted } from "@/lib/auth/allowlist";
import { createClient } from "@/lib/supabase/server";

export type DraftSession = {
  userId: string;
  email: string;
  business: Business;
  kb: KnowledgeBase | null;
};

/**
 * Loads (or creates) the signed-in user's draft business. Used by every
 * onboarding step to read/write the in-progress wizard state.
 *
 * - No auth → /auth/sign-up
 * - Business exists with status=live → /dashboard (they're done)
 * - Otherwise returns the draft + KB for the wizard to render
 */
export async function loadDraftSession(): Promise<DraftSession> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/sign-up");

  const userId = data.claims.sub as string;
  const email = (data.claims.email as string | undefined) ?? "";

  let [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);

  if (business?.status === "live") {
    redirect("/dashboard");
  }

  // Private-beta gate, defense-in-depth: even if someone got past the
  // signup form / OAuth callback, block them from creating a draft
  // business if they're not on the allowlist. Existing tenants (a row
  // already loaded above) are grandfathered in regardless.
  if (!business && !isEmailAllowlisted(email)) {
    redirect("/auth/waitlist");
  }

  if (!business) {
    [business] = await db
      .insert(businesses)
      .values({
        name: "",
        ownerName: "",
        ownerEmail: email,
        ownerPhone: "",
        ownerUserId: userId,
        timezone: "America/Los_Angeles",
        status: "pending",
        onboardingStep: "business",
      })
      .returning();
  }

  let [kb] = await db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.businessId, business.id))
    .limit(1);

  if (!kb) {
    [kb] = await db
      .insert(knowledgeBase)
      .values({ businessId: business.id })
      .returning();
  }

  return { userId, email, business, kb };
}

/**
 * Same as loadDraftSession but enforces a specific wizard step. Allows
 * BACKWARD navigation (so the wizard's Back buttons actually work) but
 * blocks jumping FORWARD past the user's highest-reached step.
 */
export async function requireStep(
  expected: Business["onboardingStep"],
): Promise<DraftSession> {
  const session = await loadDraftSession();
  const current = session.business.onboardingStep;

  if (current === "complete") redirect("/dashboard");

  const currentIdx = stepIndex(current);
  const expectedIdx = stepIndex(expected);
  // Trying to jump ahead of where they've been — bounce to their highest
  // reached step. Going back to an earlier step (currentIdx > expectedIdx)
  // is allowed so they can edit prior answers.
  if (expectedIdx > currentIdx) redirect(`/onboard/${current}`);

  return session;
}

/**
 * Compute where the user should land after saving a given step. If they're
 * editing a previous step (their highest-reached step is past this one),
 * send them back to where they were. Otherwise advance to the next step.
 *
 * Pair with `advanceStepIfAt` — together they preserve "highest reached"
 * progress when users go back to edit earlier answers.
 */
export function pathAfterSavingStep(
  business: Business,
  savedStep: Business["onboardingStep"],
): string {
  const savedIdx = stepIndex(savedStep);
  const currentIdx = stepIndex(business.onboardingStep);
  if (currentIdx > savedIdx) {
    // Editing an old step — return to highest reached.
    return nextStepPath(business);
  }
  // Forward progress — go to the next step in the wizard.
  const nextSlug = STEP_ORDER[savedIdx + 1];
  return nextSlug ? `/onboard/${nextSlug}` : "/dashboard";
}

/**
 * Returns the new `onboardingStep` value to write when saving `savedStep`.
 * Never rolls progress backward: if the user has already advanced past
 * `savedStep` (i.e., they came back to edit), keeps their current step.
 */
export function advanceStepIfAt(
  current: Business["onboardingStep"],
  savedStep: Business["onboardingStep"],
): Business["onboardingStep"] {
  const currentIdx = stepIndex(current);
  const savedIdx = stepIndex(savedStep);
  if (currentIdx > savedIdx) return current; // editing a past step
  const nextSlug = STEP_ORDER[savedIdx + 1];
  return nextSlug ?? current;
}

const STEP_ORDER: Business["onboardingStep"][] = [
  "business",
  "services",
  "hours",
  "voice",
  "calendar",
  "number",
  "plan",
];

/**
 * Returns the URL the wizard should resume at given a draft state.
 * Used by /onboard root to route users to the right step.
 */
export function nextStepPath(business: Business): string {
  if (business.status === "live") return "/dashboard";
  const step = business.onboardingStep;
  if (step === "complete") return "/dashboard";
  if (step === "provisioning") return `/onboard/setup/${business.id}`;
  return `/onboard/${step}`;
}

export function stepIndex(step: Business["onboardingStep"]): number {
  return STEP_ORDER.indexOf(step);
}

export const TOTAL_STEPS = STEP_ORDER.length;
export const STEPS = STEP_ORDER;
