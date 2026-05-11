"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/db/queries";
import { sendSms, SmsQuotaExceededError } from "@/lib/telephony/twilio";

const replySchema = z.object({
  contactId: z.string().uuid(),
  body: z.string().min(1).max(1000),
});

export type ReplyState =
  | { ok: false; error?: string }
  | { ok: true; sentAt: string };

export async function sendOwnerReply(
  _prev: ReplyState,
  form: FormData,
): Promise<ReplyState> {
  const parsed = replySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, error: "Type a message before sending." };
  }

  const { business } = await requireBusiness();

  const [contact] = await db
    .select({ id: contacts.id, phone: contacts.phone })
    .from(contacts)
    .where(
      and(
        eq(contacts.businessId, business.id),
        eq(contacts.id, parsed.data.contactId),
      ),
    )
    .limit(1);

  if (!contact) return { ok: false, error: "Contact not found." };
  if (!contact.phone) return { ok: false, error: "Contact has no phone number on file." };

  try {
    await sendSms({
      businessId: business.id,
      contactId: contact.id,
      to: contact.phone,
      body: parsed.data.body.trim(),
      sender: "owner",
    });
  } catch (err) {
    if (err instanceof SmsQuotaExceededError) {
      return {
        ok: false,
        error:
          "You've hit the monthly SMS limit for this business. Email support@joincopper.com if you need it raised.",
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't send the message.",
    };
  }

  revalidatePath(`/dashboard/messages/${parsed.data.contactId}`);
  revalidatePath("/dashboard/messages");
  return { ok: true, sentAt: new Date().toISOString() };
}

const pauseSchema = z.object({
  contactId: z.string().uuid(),
  paused: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export type PauseState =
  | { ok: false; error?: string }
  | { ok: true; paused: boolean };

export async function toggleAiPause(
  _prev: PauseState,
  form: FormData,
): Promise<PauseState> {
  const parsed = pauseSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { business } = await requireBusiness();

  const updated = await db
    .update(contacts)
    .set({ aiPaused: parsed.data.paused })
    .where(
      and(
        eq(contacts.businessId, business.id),
        eq(contacts.id, parsed.data.contactId),
      ),
    )
    .returning({ id: contacts.id });

  if (updated.length === 0) return { ok: false, error: "Contact not found." };

  revalidatePath(`/dashboard/messages/${parsed.data.contactId}`);
  revalidatePath("/dashboard/messages");
  return { ok: true, paused: parsed.data.paused };
}
