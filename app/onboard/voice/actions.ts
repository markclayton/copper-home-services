"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, knowledgeBase } from "@/lib/db/schema";
import { loadDraftSession } from "@/lib/onboarding/draft-business";
import { inngest } from "@/lib/jobs/client";

const schema = z.object({
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

  // Advance to plan step and kick off provisioning in the background so the
  // tenant's number + assistant are ready by the time they finish reading
  // the plan options.
  await db
    .update(businesses)
    .set({ onboardingStep: "plan", updatedAt: new Date() })
    .where(eq(businesses.id, business.id));

  await inngest.send({
    name: "tenant/provision-needed",
    data: { businessId: business.id },
  });

  redirect("/onboard/plan");
}
