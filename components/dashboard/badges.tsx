import { Badge } from "@/components/ui/badge";
import type {
  Appointment,
  Call,
  ReviewRequest,
} from "@/lib/db/schema";

export function CallStatusBadge({ status }: { status: Call["status"] }) {
  const variant: Record<Call["status"], "default" | "secondary" | "destructive" | "outline"> = {
    in_progress: "outline",
    completed: "secondary",
    failed: "destructive",
    no_answer: "outline",
    voicemail: "outline",
  };
  if (status === "in_progress") {
    return (
      <Badge
        variant="outline"
        className="border-red-500/40 text-red-600 dark:text-red-400 inline-flex items-center gap-1.5"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        live
      </Badge>
    );
  }
  return <Badge variant={variant[status]}>{status.replace("_", " ")}</Badge>;
}

export function CallOutcomeBadge({ outcome }: { outcome: Call["outcome"] }) {
  if (!outcome) return null;
  const tone: Record<NonNullable<Call["outcome"]>, "default" | "secondary" | "destructive" | "outline"> = {
    booked: "default",
    callback_promised: "secondary",
    no_booking: "outline",
    transferred: "secondary",
    hung_up: "destructive",
  };
  return <Badge variant={tone[outcome]}>{outcome.replace("_", " ")}</Badge>;
}

export function CallIntentBadge({ intent }: { intent: Call["intent"] }) {
  if (!intent) return null;
  return <Badge variant="outline">{intent.replace("_", " ")}</Badge>;
}

export function EmergencyBadge({ isEmergency }: { isEmergency: boolean }) {
  if (!isEmergency) return null;
  return <Badge variant="destructive">emergency</Badge>;
}

export function AppointmentStatusBadge({
  status,
}: {
  status: Appointment["status"];
}) {
  const variant: Record<Appointment["status"], "default" | "secondary" | "destructive" | "outline"> = {
    scheduled: "default",
    completed: "secondary",
    cancelled: "outline",
    no_show: "destructive",
  };
  return <Badge variant={variant[status]}>{status.replace("_", " ")}</Badge>;
}

export function ReviewStatusBadge({
  status,
}: {
  status: ReviewRequest["status"];
}) {
  const variant: Record<ReviewRequest["status"], "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    sent: "secondary",
    clicked: "default",
    completed: "secondary",
  };
  return <Badge variant={variant[status]}>{status}</Badge>;
}
