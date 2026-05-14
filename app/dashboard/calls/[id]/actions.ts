"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { calls, events } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/db/queries";

const flagSchema = z.object({
  callId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export type FlagCallState =
  | { ok: false; error?: string }
  | { ok: true };

export async function flagCallAsIncorrect(
  _prev: FlagCallState,
  form: FormData,
): Promise<FlagCallState> {
  const parsed = flagSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, error: "Please add a short note about what went wrong." };
  }

  const { business } = await requireBusiness();

  // RLS would catch this but belt-and-suspenders: verify the call belongs to
  // this owner before logging the flag.
  const [call] = await db
    .select({ id: calls.id })
    .from(calls)
    .where(and(eq(calls.id, parsed.data.callId), eq(calls.businessId, business.id)))
    .limit(1);
  if (!call) return { ok: false, error: "Call not found." };

  await db.insert(events).values({
    businessId: business.id,
    type: "call.flagged_by_owner",
    payload: {
      callId: parsed.data.callId,
      reason: parsed.data.reason,
    },
  });

  revalidatePath(`/dashboard/calls/${parsed.data.callId}`);
  return { ok: true };
}
