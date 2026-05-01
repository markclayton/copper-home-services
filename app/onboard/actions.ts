"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, knowledgeBase, events } from "@/lib/db/schema";

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

const onboardSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().min(7),
  phoneMain: z.string().optional(),
  phoneForwarding: z.string().optional(),
  timezone: z.string().min(1),
  serviceAreaZips: z.string().optional(),
  googleReviewUrl: z.string().url().optional().or(z.literal("")),
  existingCrm: z.string().optional(),
  hours: z.string(),
  services: z.string(),
  faqs: z.string(),
  pricing: z.string(),
  policies: z.string(),
  brandVoiceNotes: z.string().optional(),
  emergencyCriteria: z.string().optional(),
  voicemailScript: z.string().optional(),
  afterHoursPolicy: z.string().optional(),
  quoteCallbackWindow: z.string().optional(),
});

export type SubmitOnboardingState = {
  ok: boolean;
  error?: string;
};

function parseJson<T>(raw: string, label: string): T {
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export async function submitOnboarding(
  _prev: SubmitOnboardingState,
  form: FormData,
): Promise<SubmitOnboardingState> {
  const parsed = onboardSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  const v = parsed.data;

  let hours: unknown;
  let services: unknown;
  let faqs: unknown;
  let pricing: unknown;
  let policies: unknown;
  try {
    hours = hoursSchema.parse(parseJson(v.hours, "hours"));
    services = parseJson(v.services, "services");
    faqs = parseJson(v.faqs, "faqs");
    pricing = parseJson(v.pricing, "pricing");
    policies = parseJson(v.policies, "policies");
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }

  const zips = v.serviceAreaZips
    ? v.serviceAreaZips
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const [business] = await db
    .insert(businesses)
    .values({
      name: v.name,
      ownerName: v.ownerName,
      ownerEmail: v.ownerEmail,
      ownerPhone: v.ownerPhone,
      phoneMain: v.phoneMain || null,
      phoneForwarding: v.phoneForwarding || null,
      timezone: v.timezone,
      serviceAreaZips: zips.length > 0 ? zips : null,
      googleReviewUrl: v.googleReviewUrl || null,
      hours: hours as Record<string, unknown>,
      status: "pending",
    })
    .returning({ id: businesses.id });

  await db.insert(knowledgeBase).values({
    businessId: business.id,
    services: services as Record<string, unknown>,
    faqs: faqs as Record<string, unknown>,
    pricing: pricing as Record<string, unknown>,
    policies: policies as Record<string, unknown>,
    brandVoiceNotes: v.brandVoiceNotes || null,
    emergencyCriteria: v.emergencyCriteria || null,
    voicemailScript: v.voicemailScript || null,
    afterHoursPolicy: v.afterHoursPolicy || null,
    quoteCallbackWindow: v.quoteCallbackWindow || null,
  });

  await db.insert(events).values({
    businessId: business.id,
    type: "onboarding.submitted",
    payload: {
      ownerEmail: v.ownerEmail,
      existingCrm: v.existingCrm ?? null,
    },
  });

  redirect("/onboard/thanks");
}
