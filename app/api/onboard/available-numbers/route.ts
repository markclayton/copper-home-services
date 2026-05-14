/**
 * Returns a short list of available local US numbers from Twilio, optionally
 * filtered by area code. Used by the onboarding number-selection step so the
 * owner can pick a specific number before checkout.
 *
 * Auth-gated: only the signed-in user (who owns a draft business) can call
 * this. Otherwise we'd be giving anyone the ability to drain Twilio search
 * quota and probe inventory.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { listAvailableLocalNumbers } from "@/lib/provisioning/twilio";

const AREA_CODE_RE = /^[2-9]\d{2}$/;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = data.claims.sub as string;

  const [biz] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);
  if (!biz) {
    return NextResponse.json({ error: "no_business" }, { status: 404 });
  }

  const url = new URL(req.url);
  const areaCodeRaw = url.searchParams.get("areaCode")?.trim() || undefined;
  if (areaCodeRaw && !AREA_CODE_RE.test(areaCodeRaw)) {
    return NextResponse.json(
      { error: "invalid_area_code", message: "Area code must be 3 digits, first digit 2-9." },
      { status: 400 },
    );
  }

  try {
    const numbers = await listAvailableLocalNumbers({
      areaCode: areaCodeRaw,
      limit: 10,
    });

    // If a specific area code was requested and Twilio had no inventory,
    // fall back to any US local so the UI doesn't dead-end the user.
    if (numbers.length === 0 && areaCodeRaw) {
      const fallback = await listAvailableLocalNumbers({ limit: 10 });
      return NextResponse.json({
        numbers: fallback,
        requestedAreaCode: areaCodeRaw,
        fellBack: true,
      });
    }

    return NextResponse.json({
      numbers,
      requestedAreaCode: areaCodeRaw ?? null,
      fellBack: false,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "twilio_search_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
