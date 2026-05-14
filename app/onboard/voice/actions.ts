"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, knowledgeBase } from "@/lib/db/schema";
import {
  advanceStepIfAt,
  loadDraftSession,
  pathAfterSavingStep,
} from "@/lib/onboarding/draft-business";
import { DEFAULT_VOICE_ID, isValidVoiceId } from "@/lib/voice/voices";

const schema = z.object({
  voiceId: z.string().refine(isValidVoiceId, "Pick a voice").optional(),
  brandVoiceNotes: z.string().optional(),
  emergencyCriteria: z.string().optional(),
  voicemailScript: z.string().optional(),
});

export type VoiceStepState = { ok: boolean; error?: string };

export async function saveVoiceStep(
  _prev: VoiceStepState,
  form: FormData,
): Promise<VoiceStepState> {
  const { business } = await loadDraftSession();

  const parsed = schema.safeParse({
    voiceId: form.get("voiceId"),
    brandVoiceNotes: form.get("brandVoiceNotes"),
    emergencyCriteria: form.get("emergencyCriteria"),
    voicemailScript: form.get("voicemailScript"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  await db
    .update(knowledgeBase)
    .set({
      brandVoiceNotes: parsed.data.brandVoiceNotes || null,
      emergencyCriteria: parsed.data.emergencyCriteria || null,
      voicemailScript: parsed.data.voicemailScript || null,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeBase.businessId, business.id));

  const redirectPath = pathAfterSavingStep(business, "voice");

  await db
    .update(businesses)
    .set({
      voiceId: parsed.data.voiceId ?? DEFAULT_VOICE_ID,
      onboardingStep: advanceStepIfAt(business.onboardingStep, "voice"),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  // No provisioning here — Twilio number purchase + Vapi assistant deploy
  // happen after Stripe checkout completes (see activateNewTenant in the
  // Stripe webhook). Keeps us from spending money on numbers for users who
  // never finish paying.

  redirect(redirectPath);
}
