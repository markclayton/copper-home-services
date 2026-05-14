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

export async function skipCalendarStep(): Promise<void> {
  const { business } = await loadDraftSession();
  const redirectPath = pathAfterSavingStep(business, "calendar");
  await db
    .update(businesses)
    .set({
      onboardingStep: advanceStepIfAt(business.onboardingStep, "calendar"),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));
  redirect(redirectPath);
}

export async function advanceFromCalendar(): Promise<void> {
  const { business } = await loadDraftSession();
  const redirectPath = pathAfterSavingStep(business, "calendar");
  await db
    .update(businesses)
    .set({
      onboardingStep: advanceStepIfAt(business.onboardingStep, "calendar"),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));
  redirect(redirectPath);
}
