"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { loadDraftSession } from "@/lib/onboarding/draft-business";

export async function skipCalendarStep(): Promise<void> {
  const { business } = await loadDraftSession();
  await db
    .update(businesses)
    .set({ onboardingStep: "plan", updatedAt: new Date() })
    .where(eq(businesses.id, business.id));
  redirect("/onboard/plan");
}

export async function advanceFromCalendar(): Promise<void> {
  const { business } = await loadDraftSession();
  await db
    .update(businesses)
    .set({ onboardingStep: "plan", updatedAt: new Date() })
    .where(eq(businesses.id, business.id));
  redirect("/onboard/plan");
}
