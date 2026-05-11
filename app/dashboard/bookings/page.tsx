import { CalendarDays } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppointmentStatusBadge } from "@/components/dashboard/badges";
import { EmptyState } from "@/components/dashboard/empty-state";
import { listUpcomingAppointments, requireBusiness } from "@/lib/db/queries";
import { formatDateTime, formatPhone } from "@/lib/format";

export default async function BookingsPage() {
  const { business } = await requireBusiness();
  const rows = await listUpcomingAppointments(business.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} upcoming appointments.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing on the calendar yet"
          description="When your AI books an appointment, it appears here automatically. You can also see the call it came from on the Calls page."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {formatDateTime(row.startAt, business.timezone)}
                  </TableCell>
                  <TableCell>
                    <div>{row.contactName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatPhone(row.contactPhone)}
                    </div>
                  </TableCell>
                  <TableCell>{row.serviceType ?? "—"}</TableCell>
                  <TableCell>
                    <AppointmentStatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
