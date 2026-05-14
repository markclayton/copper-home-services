import Link from "next/link";
import { PhoneCall } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CallIntentBadge,
  CallOutcomeBadge,
  CallStatusBadge,
  EmergencyBadge,
} from "@/components/dashboard/badges";
import { EmptyState } from "@/components/dashboard/empty-state";
import { listCalls, requireBusiness } from "@/lib/db/queries";
import {
  formatDuration,
  formatPhone,
  formatRelative,
} from "@/lib/format";

export default async function CallsPage() {
  const { business } = await requireBusiness();
  const rows = await listCalls(business.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Calls</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} most recent calls.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="No calls yet"
          description={
            business.twilioNumber
              ? `Calls to ${formatPhone(business.twilioNumber)} will appear here with transcripts, summaries, and any bookings the AI made.`
              : "Once your AI is wired to a phone number, every call shows up here in real time."
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/calls/${row.id}`} className="block">
                      {formatRelative(row.startedAt ?? row.createdAt)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/calls/${row.id}`} className="block">
                      <div>{row.contactName ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatPhone(row.contactPhone ?? row.fromNumber)}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <CallStatusBadge status={row.status} />
                      <EmergencyBadge isEmergency={row.isEmergency} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <CallIntentBadge intent={row.intent} />
                  </TableCell>
                  <TableCell>
                    <CallOutcomeBadge outcome={row.outcome} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDuration(row.durationSec)}
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
