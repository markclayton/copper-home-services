import { NextResponse, type NextRequest } from "next/server";
import twilio from "twilio";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, contacts, messages } from "@/lib/db/schema";
import { env } from "@/lib/env";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response/>`;

function twimlResponse(status = 200) {
  return new NextResponse(EMPTY_TWIML, {
    status,
    headers: { "content-type": "text/xml" },
  });
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
  const formParams = Object.fromEntries(new URLSearchParams(rawBody));

  const signature = req.headers.get("x-twilio-signature");
  const authToken = env.TWILIO_AUTH_TOKEN;
  if (authToken && signature) {
    // Twilio signs the full webhook URL it called. Trust the forwarded host
    // header set by Vercel's proxy if present, otherwise use the request URL.
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const path = new URL(req.url).pathname;
    const fullUrl = host ? `${proto}://${host}${path}` : req.url;

    const valid = twilio.validateRequest(
      authToken,
      signature,
      fullUrl,
      formParams,
    );
    if (!valid) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else if (authToken && !signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 401 });
  }

  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (!business) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  const messageSid = formParams.MessageSid ?? formParams.SmsMessageSid;
  const fromNumber = formParams.From;
  const toNumber = formParams.To;
  const body = formParams.Body ?? "";

  if (!messageSid || !fromNumber) {
    return twimlResponse(200); // silently ack malformed
  }

  const contactId = await upsertContact(business.id, fromNumber);

  await db
    .insert(messages)
    .values({
      businessId: business.id,
      contactId,
      direction: "inbound",
      body,
      twilioSid: messageSid,
      status: "delivered",
      fromNumber,
      toNumber: toNumber ?? null,
      sentAt: new Date(),
    })
    .onConflictDoNothing({ target: messages.twilioSid });

  return twimlResponse(200);
}

async function upsertContact(
  businessId: string,
  phone: string,
): Promise<string> {
  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.businessId, businessId), eq(contacts.phone, phone)))
    .limit(1);

  if (existing) {
    await db
      .update(contacts)
      .set({ lastSeenAt: new Date() })
      .where(eq(contacts.id, existing.id));
    return existing.id;
  }

  const [created] = await db
    .insert(contacts)
    .values({
      businessId,
      phone,
      source: "sms",
    })
    .returning({ id: contacts.id });

  return created.id;
}
