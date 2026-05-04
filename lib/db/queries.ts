import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  appointments,
  businesses,
  calls,
  contacts,
  reviewRequests,
  type Appointment,
  type Business,
  type Call,
  type ReviewRequest,
} from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export type CurrentSession = {
  userId: string;
  email: string | null;
  business: Business;
};

/**
 * Resolves the signed-in user's tenant. Redirects to login if no session, or
 * to a "no business linked" landing page if the auth user isn't owner of any
 * business yet (white-glove onboarding hasn't completed the link).
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
  if (business.status !== "live") redirect("/onboard");

  return { userId, email, business };
}

export type TodayMetrics = {
  totalCalls: number;
  bookedToday: number;
  emergencies: number;
  reviewsRequested: number;
  conversionPct: number;
};

export async function getTodayMetrics(business: Business): Promise<TodayMetrics> {
  const tz = business.timezone;
  const todayStart = sql`date_trunc('day', now() AT TIME ZONE ${tz})`;
  const callLocal = sql`(${calls.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}`;
  const apptLocal = sql`(${appointments.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}`;
  const reviewLocal = sql`(${reviewRequests.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}`;

  const [callStats] = await db
    .select({
      total: count(),
      emergencies: sql<number>`count(*) filter (where ${calls.isEmergency})`.as(
        "emergencies",
      ),
    })
    .from(calls)
    .where(and(eq(calls.businessId, business.id), gte(callLocal, todayStart)));

  const [bookedStats] = await db
    .select({ total: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, business.id),
        gte(apptLocal, todayStart),
      ),
    );

  const [reviewStats] = await db
    .select({ total: count() })
    .from(reviewRequests)
    .where(
      and(
        eq(reviewRequests.businessId, business.id),
        gte(reviewLocal, todayStart),
      ),
    );

  const totalCalls = callStats?.total ?? 0;
  const bookedToday = bookedStats?.total ?? 0;
  return {
    totalCalls,
    bookedToday,
    emergencies: Number(callStats?.emergencies ?? 0),
    reviewsRequested: reviewStats?.total ?? 0,
    conversionPct:
      totalCalls > 0 ? Math.round((bookedToday / totalCalls) * 100) : 0,
  };
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
