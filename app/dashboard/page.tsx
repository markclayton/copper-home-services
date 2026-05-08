import Link from "next/link";
import { ArrowRight, Calendar, Phone, TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CallIntentBadge,
  CallOutcomeBadge,
  EmergencyBadge,
} from "@/components/dashboard/badges";
import { PhoneNumberCard } from "@/components/dashboard/phone-number-card";
import {
  getTodayCalls,
  getTodayMetrics,
  listUpcomingAppointments,
  requireBusiness,
} from "@/lib/db/queries";
import { formatPhone, formatRelative, formatTime } from "@/lib/format";

export default async function TodayPage() {
  const { business } = await requireBusiness();
  const [metrics, todayCalls, upcoming] = await Promise.all([
    getTodayMetrics(business),
    getTodayCalls(business, 8),
    listUpcomingAppointments(business.id, 5),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat("en-US", {
            timeZone: business.timezone,
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(new Date())}
        </p>
      </div>

      {business.twilioNumber && (
        <PhoneNumberCard phone={business.twilioNumber} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Calls"
          value={metrics.totalCalls}
          delta={metrics.deltas.calls}
          deltaLabel="vs yesterday"
        />
        <MetricCard
          title="Booked"
          value={metrics.bookedToday}
          delta={metrics.deltas.booked}
          deltaLabel={`${metrics.conversionPct}% conversion`}
          deltaIsHint={!metrics.deltas.booked}
        />
        <MetricCard
          title="Emergencies"
          value={metrics.emergencies}
          delta={metrics.deltas.emergencies}
          deltaLabel="vs yesterday"
          invertColor
        />
        <MetricCard
          title="Reviews"
          value={metrics.reviewsRequested}
          deltaLabel="requested today"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground" />
                Upcoming
              </CardTitle>
              <Link
                href="/dashboard/bookings"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                All <ArrowRight size={12} />
              </Link>
            </div>
            <CardDescription>Next appointments your AI booked.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nothing scheduled. New bookings appear here automatically.
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {upcoming.map((appt) => (
                  <li key={appt.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="font-medium text-sm truncate">
                        {appt.contactName ?? "Caller"}
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {formatRelativeDay(appt.startAt, business.timezone)}{" "}
                        {formatTime(appt.startAt, business.timezone)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {appt.serviceType ?? "Service visit"}
                      {appt.contactPhone &&
                        ` · ${formatPhone(appt.contactPhone)}`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone size={16} className="text-muted-foreground" />
                Today&apos;s calls
              </CardTitle>
              <Link
                href="/dashboard/calls"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                All <ArrowRight size={12} />
              </Link>
            </div>
            <CardDescription>
              What your AI handled today. Tap any call to read the transcript.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayCalls.length === 0 ? (
              <EmptyTodayState
                aiNumber={business.twilioNumber}
              />
            ) : (
              <ul className="flex flex-col divide-y">
                {todayCalls.map((call) => (
                  <li key={call.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/dashboard/calls/${call.id}`}
                      className="block group"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="font-medium text-sm truncate group-hover:underline">
                          {call.contactName ??
                            (call.fromNumber
                              ? formatPhone(call.fromNumber)
                              : "Unknown caller")}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {formatRelative(call.createdAt)}
                        </div>
                      </div>
                      {call.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {call.summary}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <EmergencyBadge isEmergency={call.isEmergency} />
                        <CallIntentBadge intent={call.intent} />
                        <CallOutcomeBadge outcome={call.outcome} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  delta,
  deltaLabel,
  deltaIsHint,
  invertColor,
}: {
  title: string;
  value: number;
  delta?: number;
  deltaLabel: string;
  deltaIsHint?: boolean;
  invertColor?: boolean;
}) {
  const showDelta = delta !== undefined && delta !== 0 && !deltaIsHint;
  const positive = (delta ?? 0) > 0;
  // For most metrics up=good. For emergencies, up=bad — invert.
  const good = invertColor ? !positive : positive;
  const tone = good ? "text-emerald-600" : "text-rose-600";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {showDelta && (
            <span className={`inline-flex items-center gap-0.5 font-medium ${tone}`}>
              {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {positive ? "+" : ""}
              {delta}
            </span>
          )}
          <span>{deltaLabel}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyTodayState({ aiNumber }: { aiNumber: string | null }) {
  return (
    <div className="py-6 flex flex-col items-center text-center gap-2">
      <div className="text-sm font-medium">Quiet day so far</div>
      <p className="text-xs text-muted-foreground max-w-sm">
        No calls have come in yet today. When your AI answers, every call shows
        up here in real time with a transcript and summary.
      </p>
      {aiNumber && (
        <a
          href={`tel:${aiNumber}`}
          className="text-xs font-medium text-foreground underline underline-offset-4 mt-1"
        >
          Call {formatPhone(aiNumber)} to test it
        </a>
      )}
    </div>
  );
}

function formatRelativeDay(d: Date | string, tz: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric", month: "numeric", year: "numeric" });
  const today = fmt.format(now);
  const target = fmt.format(date);
  if (today === target) return "Today";
  const tomorrow = fmt.format(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  if (tomorrow === target) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(date);
}
