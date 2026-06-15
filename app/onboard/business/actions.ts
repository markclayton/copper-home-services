"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, knowledgeBase } from "@/lib/db/schema";
import { normalizeUsPhone } from "@/lib/format";
import { INDUSTRY_VALUES } from "@/lib/industry";
import { getStarterPack } from "@/lib/industry-starter-packs";
import {
  advanceStepIfAt,
  loadDraftSession,
  pathAfterSavingStep,
} from "@/lib/onboarding/draft-business";
import { trackOnboardingStepCompleted } from "@/lib/observability/events";

const schema = z.object({
  name: z.string().min(1, "Business name is required"),
  industry: z.enum(INDUSTRY_VALUES, {
    message: "Pick the industry that fits best",
  }),
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
  const { business, email, userId } = await loadDraftSession();

  const parsed = schema.safeParse({
    name: form.get("name"),
    industry: form.get("industry"),
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
      industry: parsed.data.industry,
      ownerName: parsed.data.ownerName,
      ownerEmail: email,
      ownerPhone: parsed.data.ownerPhone,
      timezone: parsed.data.timezone,
      onboardingStep: advanceStepIfAt(business.onboardingStep, "business"),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  // Industry-aware starter content: drop sensible services/FAQs/scripts
  // into the KB so the wizard isn't an empty form. The isNull guards keep
  // returning users (and existing live tenants) from getting clobbered if
  // they come back through step 1 — only a virgin KB gets pre-filled.
  const pack = getStarterPack(parsed.data.industry);
  await db
    .update(knowledgeBase)
    .set({
      services: pack.services,
      faqs: pack.faqs,
      emergencyCriteria: pack.emergencyCriteria,
      voicemailScript: pack.voicemailScript,
      afterHoursPolicy: pack.afterHoursPolicy,
      quoteCallbackWindow: pack.quoteCallbackWindow,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(knowledgeBase.businessId, business.id),
        isNull(knowledgeBase.services),
        isNull(knowledgeBase.faqs),
        isNull(knowledgeBase.emergencyCriteria),
      ),
    );

  await trackOnboardingStepCompleted({
    userId,
    businessId: business.id,
    step: "business",
  });

  redirect(redirectPath);
}
