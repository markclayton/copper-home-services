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

const schema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+1\d{10}$/, "Pick a number from the list."),
});

export type NumberStepState = { ok: boolean; error?: string };

export async function saveNumberStep(
  _prev: NumberStepState,
  form: FormData,
): Promise<NumberStepState> {
  const { business } = await loadDraftSession();

  const parsed = schema.safeParse({
    phoneNumber: form.get("phoneNumber"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const redirectPath = pathAfterSavingStep(business, "number");

  await db
    .update(businesses)
    .set({
      desiredPhoneNumber: parsed.data.phoneNumber,
      onboardingStep: advanceStepIfAt(business.onboardingStep, "number"),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  redirect(redirectPath);
}
