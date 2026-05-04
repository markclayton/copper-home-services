"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { loadDraftSession } from "@/lib/onboarding/draft-business";

const schema = z.object({
  name: z.string().min(1, "Business name is required"),
  ownerName: z.string().min(1, "Your name is required"),
  ownerPhone: z.string().min(7, "A valid phone number is required"),
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

  await db
    .update(businesses)
    .set({
      name: parsed.data.name,
      ownerName: parsed.data.ownerName,
      ownerEmail: email,
      ownerPhone: parsed.data.ownerPhone,
      timezone: parsed.data.timezone,
      onboardingStep: "services",
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  redirect("/onboard/services");
}
