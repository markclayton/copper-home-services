import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
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
        <div className="flex flex-wrap gap-1 justify-end">
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
          {transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transcript available.</p>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              {transcript
                .filter((m) => m.message)
                .map((m, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-20 shrink-0 text-xs text-muted-foreground uppercase">
                      {m.role}
                    </div>
                    <div className="flex-1 whitespace-pre-wrap">
                      {m.message}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="text-xs text-muted-foreground">
        Call ID: {call.id}
      </div>
    </div>
  );
}
