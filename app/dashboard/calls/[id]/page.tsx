import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AppointmentStatusBadge,
  CallIntentBadge,
  CallOutcomeBadge,
  CallStatusBadge,
  EmergencyBadge,
} from "@/components/dashboard/badges";
import { FlagCallButton } from "@/components/dashboard/flag-call-button";
import { LiveTranscript } from "@/components/dashboard/live-transcript";
import { db } from "@/lib/db";
import { callTranscriptSegments, events } from "@/lib/db/schema";
import { getCall, requireBusiness } from "@/lib/db/queries";
import {
  formatDateTime,
  formatDuration,
  formatPhone,
} from "@/lib/format";
import type { VapiTranscriptMessage } from "@/lib/voice/types";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { business } = await requireBusiness();
  const call = await getCall(business.id, id);
  if (!call) notFound();

  const transcript = (call.transcript ?? []) as VapiTranscriptMessage[];

  // Pull any live segments captured during the call. When status is
  // 'in_progress' the LiveTranscript component will keep polling and
  // append new ones. When the call is done, segments are the higher-
  // fidelity source and supersede the jsonb canonical transcript.
  const segments = await db
    .select({
      id: callTranscriptSegments.id,
      role: callTranscriptSegments.role,
      text: callTranscriptSegments.text,
      timeOffsetMs: callTranscriptSegments.timeOffsetMs,
      createdAt: callTranscriptSegments.createdAt,
    })
    .from(callTranscriptSegments)
    .where(eq(callTranscriptSegments.callId, id))
    .orderBy(asc(callTranscriptSegments.timeOffsetMs));

  const [flagged] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.businessId, business.id),
        eq(events.type, "call.flagged_by_owner"),
        sql`${events.payload}->>'callId' = ${id}`,
      ),
    )
    .limit(1);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <Link
          href="/dashboard/calls"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back to calls
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">
            {call.contactName ?? "Unknown caller"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatPhone(call.contactPhone ?? call.fromNumber)} ·{" "}
            {formatDateTime(call.startedAt ?? call.createdAt, business.timezone)}
            {call.durationSec != null && (
              <> · {formatDuration(call.durationSec)}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 sm:justify-end">
          <CallStatusBadge status={call.status} />
          <EmergencyBadge isEmergency={call.isEmergency} />
          <CallIntentBadge intent={call.intent} />
          <CallOutcomeBadge outcome={call.outcome} />
        </div>
      </div>

      {call.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {call.summary}
          </CardContent>
        </Card>
      )}

      {call.recordingUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <audio
              controls
              src={call.recordingUrl}
              className="w-full"
              preload="none"
            />
          </CardContent>
        </Card>
      )}

      {call.appointment && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Appointment booked</CardTitle>
              <CardDescription>
                {call.appointment.serviceType ?? "Service visit"} ·{" "}
                {formatDateTime(call.appointment.startAt, business.timezone)}
              </CardDescription>
            </div>
            <AppointmentStatusBadge status={call.appointment.status} />
          </CardHeader>
          {call.appointment.notes && (
            <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
              {call.appointment.notes}
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          {call.status === "in_progress" ? (
            <LiveTranscript
              callId={call.id}
              initialSegments={segments.map((s) => ({
                id: s.id,
                role: s.role,
                text: s.text,
                timeOffsetMs: s.timeOffsetMs,
                createdAt: s.createdAt.toISOString(),
              }))}
            />
          ) : segments.length > 0 ? (
            <div className="flex flex-col gap-3 text-sm">
              {segments.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row gap-1 sm:gap-3"
                >
                  <div className="sm:w-20 shrink-0 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {s.role}
                  </div>
                  <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                    {s.text}
                  </div>
                </div>
              ))}
            </div>
          ) : transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transcript available.</p>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              {transcript
                .filter((m) => m.message)
                .map((m, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row gap-1 sm:gap-3"
                  >
                    <div className="sm:w-20 shrink-0 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {m.role}
                    </div>
                    <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                      {m.message}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <FlagCallButton callId={call.id} alreadyFlagged={!!flagged} />
        <div className="text-xs text-muted-foreground font-mono">
          {call.id}
        </div>
      </div>
    </div>
  );
}
