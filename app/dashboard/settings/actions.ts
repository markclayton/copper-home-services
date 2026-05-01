"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  businesses,
  knowledgeBase,
  type NewBusiness,
} from "@/lib/db/schema";
import { requireBusiness } from "@/lib/db/queries";
import { deployAssistant } from "@/lib/voice/deploy";

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

const settingsSchema = z.object({
  // business
  name: z.string().min(1),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().min(7),
  timezone: z.string().min(1),
  serviceAreaZips: z.string().optional(), // comma-separated
  googleReviewUrl: z.string().url().optional().or(z.literal("")),
  hours: z.string(), // JSON-encoded

  // knowledge base
  services: z.string(), // JSON
  faqs: z.string(), // JSON
  pricing: z.string(), // JSON
  policies: z.string(), // JSON

  // voice config
  brandVoiceNotes: z.string().optional(),
  emergencyCriteria: z.string().optional(),
  voicemailScript: z.string().optional(),
  afterHoursPolicy: z.string().optional(),
  quoteCallbackWindow: z.string().optional(),
});

export type SaveSettingsState = {
  ok: boolean;
  error?: string;
  deployStatus?: string;
};

function parseJson<T>(raw: string, label: string): T {
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export async function saveSettings(
  _prev: SaveSettingsState,
  form: FormData,
): Promise<SaveSettingsState> {
  const { business } = await requireBusiness();

  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
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

  const businessUpdate: Partial<NewBusiness> = {
    name: v.name,
    ownerName: v.ownerName,
    ownerEmail: v.ownerEmail,
    ownerPhone: v.ownerPhone,
    timezone: v.timezone,
    serviceAreaZips: zips,
    googleReviewUrl: v.googleReviewUrl || null,
    hours: hours as Record<string, unknown>,
    updatedAt: new Date(),
  };

  await db
    .update(businesses)
    .set(businessUpdate)
    .where(eq(businesses.id, business.id));

  await db
    .update(knowledgeBase)
    .set({
      services: services as Record<string, unknown>,
      faqs: faqs as Record<string, unknown>,
      pricing: pricing as Record<string, unknown>,
      policies: policies as Record<string, unknown>,
      brandVoiceNotes: v.brandVoiceNotes || null,
      emergencyCriteria: v.emergencyCriteria || null,
      voicemailScript: v.voicemailScript || null,
      afterHoursPolicy: v.afterHoursPolicy || null,
      quoteCallbackWindow: v.quoteCallbackWindow || null,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeBase.businessId, business.id));

  let deployStatus: string;
  try {
    const result = await deployAssistant(business.id);
    deployStatus = result.ok
      ? `Vapi assistant ${result.action} (${result.assistantId}).`
      : `Settings saved. Vapi not redeployed: ${result.reason}.`;
  } catch (err) {
    deployStatus = `Settings saved. Vapi redeploy failed: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, deployStatus };
}
