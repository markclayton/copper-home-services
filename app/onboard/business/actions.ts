"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { normalizeUsPhone } from "@/lib/format";
import {
  advanceStepIfAt,
  loadDraftSession,
  pathAfterSavingStep,
} from "@/lib/onboarding/draft-business";

const schema = z.object({
  name: z.string().min(1, "Business name is required"),
  ownerName: z.string().min(1, "Your name is required"),
  ownerPhone: z
    .string()
    .min(1, "Your cell phone is required")
    .transform((v, ctx) => {
      const normalized = normalizeUsPhone(v);
      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid US phone number, e.g. (555) 123-4567",
        });
        return z.NEVER;
      }
      return normalized;
    }),
  timezone: z.string().min(1),
});

export type BusinessStepState = { ok: boolean; error?: string };

export async function saveBusinessStep(
  _prev: BusinessStepState,
  form: FormData,
): Promise<BusinessStepState> {
  const { business, email } = await loadDraftSession();

  const parsed = schema.safeParse({
    name: form.get("name"),
    ownerName: form.get("ownerName"),
    ownerPhone: form.get("ownerPhone"),
    timezone: form.get("timezone"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const redirectPath = pathAfterSavingStep(business, "business");

  await db
    .update(businesses)
    .set({
      name: parsed.data.name,
      ownerName: parsed.data.ownerName,
      ownerEmail: email,
      ownerPhone: parsed.data.ownerPhone,
      timezone: parsed.data.timezone,
      onboardingStep: advanceStepIfAt(business.onboardingStep, "business"),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  redirect(redirectPath);
}
