import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, events } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { inngest } from "@/lib/jobs/client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const leadSchema = z.object({
  phone: z.string().min(7),
  name: z.string().optional(),
  email: z.string().email().optional(),
  service: z.string().optional(),
  message: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

function verifySignature(rawBody: string, header: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = header.replace(/^sha256=/, "");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ business_id: string }> },
) {
  const { business_id: businessId } = await params;
  if (!UUID_RE.test(businessId)) {
    return NextResponse.json({ error: "invalid business id" }, { status: 400 });
  }

  const rawBody = await req.text();

  const secret = env.INTERNAL_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-copper-signature") ?? "";
    if (!sig || !verifySignature(rawBody, sig, secret)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (!business) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  await db.insert(events).values({
    businessId,
    type: "lead.web_form.received",
    payload: parsed.data as unknown as Record<string, unknown>,
  });

  await inngest.send({
    name: "lead/web-form-submitted",
    data: { businessId, ...parsed.data },
  });

  return NextResponse.json({ ok: true });
}
