import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, events } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { inngest } from "@/lib/jobs/client";

// Per-business rate limit so a leaked secret or misbehaving form can't
// rack up unlimited Vapi outbound calls. Tunable; favor low for now.
const LEAD_RATE_LIMIT_PER_HOUR = 12;

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
  // Production must have a signing secret. Development can skip it for
  // local curl tests, but log loudly so we don't ship to prod without one.
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "server misconfigured: INTERNAL_WEBHOOK_SECRET not set" },
        { status: 500 },
      );
    }
  } else {
    const sig = req.headers.get("x-copper-signature") ?? "";
    if (!sig || !verifySignature(rawBody, sig, secret)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // Rate limit per business — count leads received in the last hour.
  const oneHourAgo = sql`now() - interval '1 hour'`;
  const [rate] = await db
    .select({ total: count() })
    .from(events)
    .where(
      and(
        eq(events.businessId, businessId),
        eq(events.type, "lead.web_form.received"),
        gte(events.createdAt, oneHourAgo),
      ),
    );
  if ((rate?.total ?? 0) >= LEAD_RATE_LIMIT_PER_HOUR) {
    await db.insert(events).values({
      businessId,
      type: "lead.web_form.rate_limited",
      payload: { limit: LEAD_RATE_LIMIT_PER_HOUR, windowHours: 1 },
    });
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: 600 },
      { status: 429, headers: { "Retry-After": "600" } },
    );
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
