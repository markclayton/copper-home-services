import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns just enough provisioning state for the plan page poller — phone
 * number once it's bought, plus assistant readiness. Auth-gated so other
 * tenants' state isn't visible.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select({
      id: businesses.id,
      ownerUserId: businesses.ownerUserId,
      twilioNumber: businesses.twilioNumber,
      vapiAssistantId: businesses.vapiAssistantId,
      onboardingStep: businesses.onboardingStep,
      status: businesses.status,
    })
    .from(businesses)
    .where(eq(businesses.id, id))
    .limit(1);

  if (!row || row.ownerUserId !== data.claims.sub) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    twilioNumber: row.twilioNumber,
    ready: !!row.twilioNumber && !!row.vapiAssistantId,
    onboardingStep: row.onboardingStep,
    status: row.status,
  });
}
