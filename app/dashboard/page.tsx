import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodayMetrics, requireBusiness } from "@/lib/db/queries";

export default async function TodayPage() {
  const { business } = await requireBusiness();
  const metrics = await getTodayMetrics(business);

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Calls"
          value={metrics.totalCalls}
          description="answered today"
        />
        <MetricCard
          title="Booked"
          value={metrics.bookedToday}
          description={`${metrics.conversionPct}% conversion`}
        />
        <MetricCard
          title="Emergencies"
          value={metrics.emergencies}
          description="flagged today"
        />
        <MetricCard
          title="Reviews requested"
          value={metrics.reviewsRequested}
          description="sent today"
        />
      </div>

      {metrics.totalCalls === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quiet day so far</CardTitle>
            <CardDescription>
              No calls have come in yet today. Activity here updates in real
              time as your AI receptionist handles calls.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
