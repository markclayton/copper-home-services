"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, knowledgeBase } from "@/lib/db/schema";
import { loadDraftSession } from "@/lib/onboarding/draft-business";

const saveSchema = z.object({
  services: z.string(),
  faqs: z.string(),
});

function parseJson<T>(raw: string, label: string): T {
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export type ServicesStepState = { ok: boolean; error?: string };

export async function saveServicesStep(
  _prev: ServicesStepState,
  form: FormData,
): Promise<ServicesStepState> {
  const { business } = await loadDraftSession();

  const parsed = saveSchema.safeParse({
    services: form.get("services"),
    faqs: form.get("faqs"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  let services: unknown;
  let faqs: unknown;
  try {
    services = parseJson(parsed.data.services, "services");
    faqs = parseJson(parsed.data.faqs, "faqs");
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  await db
    .update(knowledgeBase)
    .set({
      services: services as Record<string, unknown>,
      faqs: faqs as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeBase.businessId, business.id));

  await db
    .update(businesses)
    .set({ onboardingStep: "hours", updatedAt: new Date() })
    .where(eq(businesses.id, business.id));

  redirect("/onboard/hours");
}

/**
 * Skip the Services/FAQs step entirely — used by the "Skip for now" button.
 * Doesn't touch the knowledgeBase row; just advances onboardingStep so the
 * wizard moves on. The dashboard surfaces a checklist that nudges the user
 * back here later.
 */
export async function skipServicesStep(): Promise<void> {
  const { business } = await loadDraftSession();

  await db
    .update(businesses)
    .set({ onboardingStep: "hours", updatedAt: new Date() })
    .where(eq(businesses.id, business.id));

  redirect("/onboard/hours");
}
