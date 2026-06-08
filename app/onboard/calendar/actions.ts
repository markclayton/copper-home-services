"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import {
  advanceStepIfAt,
  loadDraftSession,
  pathAfterSavingStep,
} from "@/lib/onboarding/draft-business";
import { trackOnboardingStepCompleted } from "@/lib/observability/events";

export async function skipCalendarStep(): Promise<void> {
  const { business, userId } = await loadDraftSession();
  const redirectPath = pathAfterSavingStep(business, "calendar");
  await db
    .update(businesses)
    .set({
      onboardingStep: advanceStepIfAt(business.onboardingStep, "calendar"),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));
  await trackOnboardingStepCompleted({
    userId,
    businessId: business.id,
    step: "calendar",
  });
  redirect(redirectPath);
}

export async function advanceFromCalendar(): Promise<void> {
  const { business, userId } = await loadDraftSession();
  const redirectPath = pathAfterSavingStep(business, "calendar");
  await db
    .update(businesses)
    .set({
      onboardingStep: advanceStepIfAt(business.onboardingStep, "calendar"),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));
  await trackOnboardingStepCompleted({
    userId,
    businessId: business.id,
    step: "calendar",
  });
  redirect(redirectPath);
}
