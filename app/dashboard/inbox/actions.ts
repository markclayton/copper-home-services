"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ownerMessages } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/db/queries";

/**
 * Flip an owner_message's triage status. Owner-scoped via requireBusiness
 * — the WHERE clause makes a hostile id from another tenant a no-op.
 */
export async function setOwnerMessageStatus(
  ownerMessageId: string,
  next: "acknowledged" | "resolved",
): Promise<void> {
  const { business } = await requireBusiness();
  await db
    .update(ownerMessages)
    .set({
      status: next,
      acknowledgedAt: next === "acknowledged" ? new Date() : undefined,
    })
    .where(
      and(
        eq(ownerMessages.id, ownerMessageId),
        eq(ownerMessages.businessId, business.id),
      ),
    );
  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard");
}
