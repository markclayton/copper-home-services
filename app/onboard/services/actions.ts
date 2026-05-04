"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, knowledgeBase } from "@/lib/db/schema";
import { loadDraftSession } from "@/lib/onboarding/draft-business";
import { draftKbFromUrl, type KbDraft } from "@/lib/onboarding/draft-kb";

const urlSchema = z.string().url();

export type ServicesDraftState = {
  ok: boolean;
  draft?: KbDraft;
  error?: string;
};

export async function draftFromUrlAction(
  _prev: ServicesDraftState,
  form: FormData,
): Promise<ServicesDraftState> {
  await loadDraftSession(); // require auth
  const url = String(form.get("websiteUrl") ?? "");
  const parsed = urlSchema.safeParse(url);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid URL like https://example.com" };
  }
  try {
    const draft = await draftKbFromUrl(parsed.data);
    return { ok: true, draft };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

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
