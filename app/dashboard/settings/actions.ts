"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  businesses,
  DEFAULT_NOTIFY_CHANNELS,
  knowledgeBase,
  type NewBusiness,
  type NotifyChannels,
} from "@/lib/db/schema";
import { requireBusiness } from "@/lib/db/queries";
import { deployAssistant } from "@/lib/voice/deploy";
import { DEFAULT_VOICE_ID, isValidVoiceId } from "@/lib/voice/voices";

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
  // Checkboxes are absent from FormData when unchecked, so coerce: any
  // truthy string means "on", missing means "off".
  reviewRequestsEnabled: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  hours: z.string(), // JSON-encoded

  // knowledge base
  services: z.string(), // JSON
  faqs: z.string(), // JSON

  // voice config
  voiceId: z.string().refine(isValidVoiceId, "Pick a voice").optional(),
  brandVoiceNotes: z.string().optional(),
  emergencyCriteria: z.string().optional(),
  voicemailScript: z.string().optional(),
  afterHoursPolicy: z.string().optional(),
  quoteCallbackWindow: z.string().optional(),

  // notifications
  notifyChannels: z.string().optional(),
});

const channelSchema = z.object({ sms: z.boolean(), email: z.boolean() });
const notifyChannelsSchema = z.object({
  appointment: channelSchema,
  emergency: channelSchema,
  callSummary: channelSchema,
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
  let notifyChannels: NotifyChannels = DEFAULT_NOTIFY_CHANNELS;
  try {
    hours = hoursSchema.parse(parseJson(v.hours, "hours"));
    services = parseJson(v.services, "services");
    faqs = parseJson(v.faqs, "faqs");
    if (v.notifyChannels) {
      notifyChannels = notifyChannelsSchema.parse(
        parseJson(v.notifyChannels, "notifyChannels"),
      );
    }
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
    reviewRequestsEnabled: v.reviewRequestsEnabled,
    voiceId: v.voiceId ?? DEFAULT_VOICE_ID,
    notifyChannels,
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
      ? "Your AI is updated."
      : `Saved, but your AI couldn't update right now: ${result.reason}.`;
  } catch (err) {
    deployStatus = `Saved, but your AI couldn't update right now: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, deployStatus };
}
