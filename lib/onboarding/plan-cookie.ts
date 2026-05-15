/**
 * Plan choice (Solo vs Business) is threaded from the landing pricing CTA
 * through signup → onboarding via a short-lived cookie. We don't persist
 * the plan to the DB until checkout — that way an abandoned signup leaves
 * no orphaned plan-choice rows, and the user can still change tier by
 * clicking a different pricing card before they pay.
 */

import { cookies } from "next/headers";
import type { SelfServePlan } from "@/lib/billing/stripe";

export const PLAN_COOKIE_NAME = "copper_plan";
const PLAN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function isSelfServePlan(value: unknown): value is SelfServePlan {
  return value === "solo" || value === "business";
}

export async function setPlanCookie(plan: SelfServePlan): Promise<void> {
  const store = await cookies();
  store.set(PLAN_COOKIE_NAME, plan, {
    maxAge: PLAN_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function readPlanCookie(): Promise<SelfServePlan | null> {
  const store = await cookies();
  const value = store.get(PLAN_COOKIE_NAME)?.value;
  return isSelfServePlan(value) ? value : null;
}

export async function clearPlanCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PLAN_COOKIE_NAME);
}
