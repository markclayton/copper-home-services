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
 * Same as loadDraftSession but enforces a specific wizard step. If the user
 * jumps ahead, redirect them to their current step.
 */
export async function requireStep(
  expected: Business["onboardingStep"],
): Promise<DraftSession> {
  const session = await loadDraftSession();
  const current = session.business.onboardingStep;

  if (current === "complete") redirect("/dashboard");
  if (current !== expected) redirect(`/onboard/${current}`);

  return session;
}

const STEP_ORDER: Business["onboardingStep"][] = [
  "business",
  "services",
  "hours",
  "voice",
  "calendar",
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
