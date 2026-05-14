"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBusiness } from "@/lib/db/queries";
import { deprovisionTenant } from "@/lib/provisioning/deprovision";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const deleteSchema = z.object({
  confirmation: z.string().min(1),
});

export type DeleteAccountState =
  | { ok: false; error?: string }
  | { ok: true };

export async function deleteAccount(
  _prev: DeleteAccountState,
  form: FormData,
): Promise<DeleteAccountState> {
  const parsed = deleteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, error: "Type your business name to confirm." };
  }

  const { userId, business } = await requireBusiness();

  // Confirmation must exactly match the business name. Case-insensitive +
  // trimmed so "  acme HVAC " still works for the legitimate owner.
  const typed = parsed.data.confirmation.trim().toLowerCase();
  const expected = business.name.trim().toLowerCase();
  if (typed !== expected) {
    return {
      ok: false,
      error: `Type "${business.name}" exactly to confirm.`,
    };
  }

  const result = await deprovisionTenant(business.id);
  if (!result.ok) {
    return {
      ok: false,
      error:
        "Couldn't fully delete your account. We've logged the issue — email info@joincopper.io and we'll finish the cleanup.",
    };
  }

  // Delete the Supabase auth user. Best-effort: if this fails the business
  // row is already gone, so the user is locked out anyway. Worst case is an
  // orphaned auth.users row that we can sweep up later.
  try {
    await getSupabaseAdmin().auth.admin.deleteUser(userId);
  } catch (err) {
    console.error("[deleteAccount] failed to delete auth user", {
      userId,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Clear the session cookies, then bounce to the landing page.
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/?deleted=1");
}
