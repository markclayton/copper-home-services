"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, knowledgeBase } from "@/lib/db/schema";
import { loadDraftSession } from "@/lib/onboarding/draft-business";
import { inngest } from "@/lib/jobs/client";
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

  // Advance to calendar step and kick off provisioning in the background.
  // Connecting Google takes a redirect dance — by the time the owner gets
  // back to the plan step, the number + assistant are usually ready.
  // Tool handlers read fresh business state on each call, so calendar
  // connections that complete after provisioning still work without a
  // re-deploy.
  await db
    .update(businesses)
    .set({
      voiceId: parsed.data.voiceId ?? DEFAULT_VOICE_ID,
      onboardingStep: "calendar",
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  await inngest.send({
    name: "tenant/provision-needed",
    data: { businessId: business.id },
  });

  redirect("/onboard/calendar");
}
