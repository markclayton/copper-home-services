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
