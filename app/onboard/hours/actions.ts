"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import {
  advanceStepIfAt,
  loadDraftSession,
  pathAfterSavingStep,
} from "@/lib/onboarding/draft-business";

const hoursDay = z.object({
  open: z.string(),
  close: z.string(),
  closed: z.boolean().optional(),
});

const hoursSchema = z.object({
  mon: hoursDay,
  tue: hoursDay,
  wed: hoursDay,
  thu: hoursDay,
  fri: hoursDay,
  sat: hoursDay,
  sun: hoursDay,
});

const schema = z.object({
  hours: z.string(),
  serviceAreaZips: z.string().optional(),
});

export type HoursStepState = { ok: boolean; error?: string };

export async function saveHoursStep(
  _prev: HoursStepState,
  form: FormData,
): Promise<HoursStepState> {
  const { business } = await loadDraftSession();

  const parsed = schema.safeParse({
    hours: form.get("hours"),
    serviceAreaZips: form.get("serviceAreaZips"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  let hours: unknown;
  try {
    hours = hoursSchema.parse(JSON.parse(parsed.data.hours));
  } catch {
    return { ok: false, error: "Invalid hours data" };
  }

  const zips = parsed.data.serviceAreaZips
    ? parsed.data.serviceAreaZips
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const redirectPath = pathAfterSavingStep(business, "hours");

  await db
    .update(businesses)
    .set({
      hours: hours as Record<string, unknown>,
      serviceAreaZips: zips.length > 0 ? zips : null,
      onboardingStep: advanceStepIfAt(business.onboardingStep, "hours"),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  redirect(redirectPath);
}
