import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  appointments,
  businesses,
  calls,
  contacts,
  events,
  messages,
  reviewRequests,
  type Appointment,
  type Business,
  type Call,
  type Message,
  type ReviewRequest,
} from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export type CurrentSession = {
  userId: string;
  email: string | null;
  business: Business;
};

/**
 * Resolves the signed-in user's tenant for the dashboard. Hard-gates on
 * status="live" — paused tenants bounce to /account-paused, mid-onboarding
 * tenants bounce to /onboard.
 */
export async function requireBusiness(): Promise<CurrentSession> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;
  const email = (data.claims.email as string | undefined) ?? null;

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);

  if (!business) redirect("/onboard");
  if (business.status === "paused") redirect("/account-paused");
  if (business.status !== "live") redirect("/onboard");

  return { userId, email, business };
}

/**
 * Looser version of requireBusiness for pages paused tenants need to reach
 * (the /account-paused page itself, reactivation actions). Returns live
 * AND paused tenants; only mid-onboarding tenants get bounced to /onboard.
 * Callers must handle status differences themselves.
 */
export async function requireLiveOrPausedBusiness(): Promise<CurrentSession> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;
  const email = (data.claims.email as string | undefined) ?? null;

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);

  if (!business) redirect("/onboard");
  if (business.status === "pending") redirect("/onboard");

  return { userId, email, business };
}

export type TodayMetrics = {
  totalCalls: number;
  bookedToday: number;
  emergencies: number;
  reviewsRequested: number;
  conversionPct: number;
  deltas: {
    calls: number;
    booked: number;
    emergencies: number;
  };
};

export async function getTodayMetrics(
  business: Business,
): Promise<TodayMetrics> {
  const tz = business.timezone;
  const todayStart = sql`date_trunc('day', now() AT TIME ZONE ${tz})`;
  const yesterdayStart = sql`date_trunc('day', now() AT TIME ZONE ${tz}) - interval '1 day'`;
  // "Now-equivalent" timestamp 24h earlier — lets us compare apples-to-apples
  // even at 9 AM (don't compare today's 9h to all of yesterday).
  const yesterdayNow = sql`(now() AT TIME ZONE ${tz}) - interval '1 day'`;
  const callLocal = sql`(${calls.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}`;
  const apptLocal = sql`(${appointments.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}`;
  const reviewLocal = sql`(${reviewRequests.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}`;

  const [callStats] = await db
    .select({
      total: count(),
      emergencies: sql<number>`count(*) filter (where ${calls.isEmergency})`.as(
        "emergencies",
      ),
      yesterdayTotal:
        sql<number>`count(*) filter (where ${callLocal} >= ${yesterdayStart} and ${callLocal} < ${yesterdayNow})`.as(
          "yesterday_total",
        ),
      yesterdayEmergencies:
        sql<number>`count(*) filter (where ${calls.isEmergency} and ${callLocal} >= ${yesterdayStart} and ${callLocal} < ${yesterdayNow})`.as(
          "yesterday_emergencies",
        ),
      todayTotal:
        sql<number>`count(*) filter (where ${callLocal} >= ${todayStart})`.as(
          "today_total",
        ),
      todayEmergencies:
        sql<number>`count(*) filter (where ${calls.isEmergency} and ${callLocal} >= ${todayStart})`.as(
          "today_emergencies",
        ),
    })
    .from(calls)
    .where(eq(calls.businessId, business.id));

  const [apptStats] = await db
    .select({
      todayTotal:
        sql<number>`count(*) filter (where ${apptLocal} >= ${todayStart})`.as(
          "today_total",
        ),
      yesterdayTotal:
        sql<number>`count(*) filter (where ${apptLocal} >= ${yesterdayStart} and ${apptLocal} < ${yesterdayNow})`.as(
          "yesterday_total",
        ),
    })
    .from(appointments)
    .where(eq(appointments.businessId, business.id));

  const [reviewStats] = await db
    .select({ total: count() })
    .from(reviewRequests)
    .where(
      and(
        eq(reviewRequests.businessId, business.id),
        gte(reviewLocal, todayStart),
      ),
    );

  const totalCalls = Number(callStats?.todayTotal ?? 0);
  const bookedToday = Number(apptStats?.todayTotal ?? 0);
  const emergencies = Number(callStats?.todayEmergencies ?? 0);
  const yesterdayCalls = Number(callStats?.yesterdayTotal ?? 0);
  const yesterdayBooked = Number(apptStats?.yesterdayTotal ?? 0);
  const yesterdayEmergencies = Number(callStats?.yesterdayEmergencies ?? 0);

  return {
    totalCalls,
    bookedToday,
    emergencies,
    reviewsRequested: reviewStats?.total ?? 0,
    conversionPct:
      totalCalls > 0 ? Math.round((bookedToday / totalCalls) * 100) : 0,
    deltas: {
      calls: totalCalls - yesterdayCalls,
      booked: bookedToday - yesterdayBooked,
      emergencies: emergencies - yesterdayEmergencies,
    },
  };
}

export async function getTodayCalls(
  business: Business,
  limit = 8,
): Promise<CallListItem[]> {
  const tz = business.timezone;
  const todayStart = sql`date_trunc('day', now() AT TIME ZONE ${tz})`;
  const callLocal = sql`(${calls.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}`;

  return db
    .select({
      id: calls.id,
      direction: calls.direction,
      status: calls.status,
      intent: calls.intent,
      outcome: calls.outcome,
      isEmergency: calls.isEmergency,
      summary: calls.summary,
      fromNumber: calls.fromNumber,
      durationSec: calls.durationSec,
      startedAt: calls.startedAt,
      endedAt: calls.endedAt,
      createdAt: calls.createdAt,
      contactName: contacts.name,
      contactPhone: contacts.phone,
    })
    .from(calls)
    .leftJoin(contacts, eq(calls.contactId, contacts.id))
    .where(and(eq(calls.businessId, business.id), gte(callLocal, todayStart)))
    .orderBy(desc(calls.createdAt))
    .limit(limit);
}

export type TodayConversation = {
  contactId: string | null;
  key: string;
  contactName: string | null;
  contactPhone: string | null;
  lastBody: string;
  lastDirection: "inbound" | "outbound";
  lastSender: "customer" | "ai" | "owner";
  lastAt: Date;
  inboundCount: number;
  flagged: boolean;
};

/**
 * Conversations that had inbound or outbound activity today, capped at
 * `limit`. Today is scoped to the business's timezone.
 */
export async function getTodayConversations(
  business: Business,
  limit = 5,
): Promise<TodayConversation[]> {
  const tz = business.timezone;
  const todayStart = sql`date_trunc('day', now() AT TIME ZONE ${tz})`;
  const msgLocal = sql`(${messages.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}`;

  const rows = await db
    .select({
      id: messages.id,
      contactId: messages.contactId,
      direction: messages.direction,
      sender: messages.sender,
      body: messages.body,
      sentAt: messages.sentAt,
      createdAt: messages.createdAt,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      fromNumber: messages.fromNumber,
      toNumber: messages.toNumber,
    })
    .from(messages)
    .leftJoin(contacts, eq(messages.contactId, contacts.id))
    .where(
      and(
        eq(messages.businessId, business.id),
        gte(msgLocal, todayStart),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit * 12);

  const byKey = new Map<string, TodayConversation>();
  for (const r of rows) {
    const key =
      r.contactId ??
      (r.direction === "inbound" ? r.fromNumber : r.toNumber) ??
      r.id;
    const existing = byKey.get(key);
    const at = r.sentAt ?? r.createdAt;
    if (!existing) {
      byKey.set(key, {
        contactId: r.contactId,
        key,
        contactName: r.contactName,
        contactPhone:
          r.contactPhone ??
          (r.direction === "inbound" ? r.fromNumber : r.toNumber),
        lastBody: r.body,
        lastDirection: r.direction,
        lastSender: r.sender,
        lastAt: at,
        inboundCount: r.direction === "inbound" ? 1 : 0,
        flagged: false,
      });
    } else {
      if (r.direction === "inbound") existing.inboundCount += 1;
      if (at > existing.lastAt) {
        existing.lastBody = r.body;
        existing.lastDirection = r.direction;
        existing.lastSender = r.sender;
        existing.lastAt = at;
      }
    }
  }

  // Annotate today's flagged conversations.
  const flaggedRows = await db
    .select({
      phone: sql<string>`${events.payload}->>'fromNumber'`,
    })
    .from(events)
    .where(
      and(
        eq(events.businessId, business.id),
        eq(events.type, "sms.flagged_for_owner"),
        gte(events.createdAt, sql`now() - interval '24 hours'`),
      ),
    );
  const flaggedPhones = new Set(
    flaggedRows.map((f) => f.phone).filter((p): p is string => !!p),
  );
  for (const c of byKey.values()) {
    if (c.contactPhone && flaggedPhones.has(c.contactPhone)) c.flagged = true;
  }

  const result = Array.from(byKey.values());
  result.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
  return result.slice(0, limit);
}

export type CallListItem = Pick<
  Call,
  | "id"
  | "direction"
  | "status"
  | "intent"
  | "outcome"
  | "isEmergency"
  | "summary"
  | "fromNumber"
  | "durationSec"
  | "startedAt"
  | "endedAt"
  | "createdAt"
> & {
  contactName: string | null;
  contactPhone: string | null;
};

export async function listCalls(
  businessId: string,
  limit = 100,
): Promise<CallListItem[]> {
  return db
    .select({
      id: calls.id,
      direction: calls.direction,
      status: calls.status,
      intent: calls.intent,
      outcome: calls.outcome,
      isEmergency: calls.isEmergency,
      summary: calls.summary,
      fromNumber: calls.fromNumber,
      durationSec: calls.durationSec,
      startedAt: calls.startedAt,
      endedAt: calls.endedAt,
      createdAt: calls.createdAt,
      contactName: contacts.name,
      contactPhone: contacts.phone,
    })
    .from(calls)
    .leftJoin(contacts, eq(calls.contactId, contacts.id))
    .where(eq(calls.businessId, businessId))
    .orderBy(desc(calls.createdAt))
    .limit(limit);
}

export type CallDetail = Call & {
  contactName: string | null;
  contactPhone: string | null;
  appointment: Appointment | null;
};

export async function getCall(
  businessId: string,
  callId: string,
): Promise<CallDetail | null> {
  const [row] = await db
    .select({
      call: calls,
      contactName: contacts.name,
      contactPhone: contacts.phone,
    })
    .from(calls)
    .leftJoin(contacts, eq(calls.contactId, contacts.id))
    .where(and(eq(calls.businessId, businessId), eq(calls.id, callId)))
    .limit(1);

  if (!row) return null;

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.callId, callId))
    .limit(1);

  return {
    ...row.call,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    appointment: appointment ?? null,
  };
}

export type AppointmentListItem = Appointment & {
  contactName: string | null;
  contactPhone: string | null;
};

export async function listUpcomingAppointments(
  businessId: string,
  limit = 100,
): Promise<AppointmentListItem[]> {
  return db
    .select({
      id: appointments.id,
      businessId: appointments.businessId,
      contactId: appointments.contactId,
      callId: appointments.callId,
      calEventId: appointments.calEventId,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      serviceType: appointments.serviceType,
      notes: appointments.notes,
      status: appointments.status,
      smsConsent: appointments.smsConsent,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      contactName: contacts.name,
      contactPhone: contacts.phone,
    })
    .from(appointments)
    .leftJoin(contacts, eq(appointments.contactId, contacts.id))
    .where(
      and(
        eq(appointments.businessId, businessId),
        gte(appointments.startAt, new Date()),
      ),
    )
    .orderBy(appointments.startAt)
    .limit(limit);
}

export type ReviewListItem = ReviewRequest & {
  contactName: string | null;
  contactPhone: string | null;
};

export async function listReviewRequests(
  businessId: string,
  limit = 100,
): Promise<ReviewListItem[]> {
  return db
    .select({
      id: reviewRequests.id,
      businessId: reviewRequests.businessId,
      appointmentId: reviewRequests.appointmentId,
      contactId: reviewRequests.contactId,
      channel: reviewRequests.channel,
      status: reviewRequests.status,
      trackingToken: reviewRequests.trackingToken,
      sentAt: reviewRequests.sentAt,
      clickedAt: reviewRequests.clickedAt,
      completedAt: reviewRequests.completedAt,
      createdAt: reviewRequests.createdAt,
      contactName: contacts.name,
      contactPhone: contacts.phone,
    })
    .from(reviewRequests)
    .leftJoin(contacts, eq(reviewRequests.contactId, contacts.id))
    .where(eq(reviewRequests.businessId, businessId))
    .orderBy(desc(reviewRequests.createdAt))
    .limit(limit);
}

export type MessageListItem = Message & {
  contactName: string | null;
  contactPhone: string | null;
};

export async function listMessages(
  businessId: string,
  limit = 100,
): Promise<MessageListItem[]> {
  return db
    .select({
      id: messages.id,
      businessId: messages.businessId,
      contactId: messages.contactId,
      direction: messages.direction,
      sender: messages.sender,
      body: messages.body,
      twilioSid: messages.twilioSid,
      status: messages.status,
      fromNumber: messages.fromNumber,
      toNumber: messages.toNumber,
      sentAt: messages.sentAt,
      createdAt: messages.createdAt,
      contactName: contacts.name,
      contactPhone: contacts.phone,
    })
    .from(messages)
    .leftJoin(contacts, eq(messages.contactId, contacts.id))
    .where(eq(messages.businessId, businessId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

export type ConversationListItem = {
  contactId: string | null;
  // Stable key for routing — contactId when present, fallback phone otherwise.
  key: string;
  contactName: string | null;
  contactPhone: string | null;
  lastBody: string;
  lastDirection: "inbound" | "outbound";
  lastSender: "customer" | "ai" | "owner";
  lastAt: Date;
  messageCount: number;
  flagged: boolean;
  aiPaused: boolean;
};

/**
 * One row per contact, with a preview of the most recent message and a flag
 * for "AI escalated this thread to you." Used as the top-level Messages view.
 */
export async function listConversations(
  businessId: string,
  limit = 100,
): Promise<ConversationListItem[]> {
  // Pull recent messages in a single query and fold into contact-keyed rows.
  // Bounded by `limit * 10` so a contact with chatty history doesn't crowd
  // out other contacts off the top of the list.
  const rows = await db
    .select({
      id: messages.id,
      contactId: messages.contactId,
      direction: messages.direction,
      sender: messages.sender,
      body: messages.body,
      sentAt: messages.sentAt,
      createdAt: messages.createdAt,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      contactAiPaused: contacts.aiPaused,
      fromNumber: messages.fromNumber,
      toNumber: messages.toNumber,
    })
    .from(messages)
    .leftJoin(contacts, eq(messages.contactId, contacts.id))
    .where(eq(messages.businessId, businessId))
    .orderBy(desc(messages.createdAt))
    .limit(limit * 10);

  const byKey = new Map<string, ConversationListItem>();
  for (const r of rows) {
    const key =
      r.contactId ??
      (r.direction === "inbound" ? r.fromNumber : r.toNumber) ??
      r.id;
    const existing = byKey.get(key);
    const at = r.sentAt ?? r.createdAt;

    if (!existing) {
      byKey.set(key, {
        contactId: r.contactId,
        key,
        contactName: r.contactName,
        contactPhone:
          r.contactPhone ??
          (r.direction === "inbound" ? r.fromNumber : r.toNumber),
        lastBody: r.body,
        lastDirection: r.direction,
        lastSender: r.sender,
        lastAt: at,
        messageCount: 1,
        flagged: false,
        aiPaused: !!r.contactAiPaused,
      });
    } else {
      existing.messageCount += 1;
      if (at > existing.lastAt) {
        existing.lastBody = r.body;
        existing.lastDirection = r.direction;
        existing.lastSender = r.sender;
        existing.lastAt = at;
      }
    }
  }

  // Annotate threads with flag status by checking the events log for any
  // `sms.flagged_for_owner` row whose payload.fromNumber matches a contact.
  // Single roundtrip; build a Set of flagged phones and stamp the matches.
  const flaggedRows = await db
    .select({
      phone: sql<string>`${events.payload}->>'fromNumber'`,
    })
    .from(events)
    .where(
      and(
        eq(events.businessId, businessId),
        eq(events.type, "sms.flagged_for_owner"),
      ),
    );
  const flaggedPhones = new Set(
    flaggedRows.map((f) => f.phone).filter((p): p is string => !!p),
  );

  const result = Array.from(byKey.values());
  for (const row of result) {
    if (row.contactPhone && flaggedPhones.has(row.contactPhone)) {
      row.flagged = true;
    }
  }

  result.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
  return result.slice(0, limit);
}

export async function getConversation(
  businessId: string,
  contactId: string,
): Promise<{
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    aiPaused: boolean;
  } | null;
  messages: MessageListItem[];
  flagReasons: { reason: string; at: Date; customerMessage: string }[];
}> {
  const [contact] = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      phone: contacts.phone,
      aiPaused: contacts.aiPaused,
    })
    .from(contacts)
    .where(
      and(eq(contacts.businessId, businessId), eq(contacts.id, contactId)),
    )
    .limit(1);
  if (!contact) {
    return { contact: null, messages: [], flagReasons: [] };
  }

  const msgs = await db
    .select({
      id: messages.id,
      businessId: messages.businessId,
      contactId: messages.contactId,
      direction: messages.direction,
      sender: messages.sender,
      body: messages.body,
      twilioSid: messages.twilioSid,
      status: messages.status,
      fromNumber: messages.fromNumber,
      toNumber: messages.toNumber,
      sentAt: messages.sentAt,
      createdAt: messages.createdAt,
      contactName: contacts.name,
      contactPhone: contacts.phone,
    })
    .from(messages)
    .leftJoin(contacts, eq(messages.contactId, contacts.id))
    .where(
      and(
        eq(messages.businessId, businessId),
        eq(messages.contactId, contactId),
      ),
    )
    .orderBy(messages.createdAt);

  const flagRows = await db
    .select({ payload: events.payload, createdAt: events.createdAt })
    .from(events)
    .where(
      and(
        eq(events.businessId, businessId),
        eq(events.type, "sms.flagged_for_owner"),
        sql`${events.payload}->>'fromNumber' = ${contact.phone ?? ""}`,
      ),
    )
    .orderBy(desc(events.createdAt));

  const flagReasons = flagRows
    .map((f) => {
      const p = (f.payload ?? {}) as Record<string, unknown>;
      return {
        reason: typeof p.reason === "string" ? p.reason : "",
        customerMessage:
          typeof p.customerMessage === "string" ? p.customerMessage : "",
        at: f.createdAt,
      };
    })
    .filter((f) => f.reason);

  return { contact, messages: msgs, flagReasons };
}
