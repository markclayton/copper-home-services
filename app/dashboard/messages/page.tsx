import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listMessages, requireBusiness } from "@/lib/db/queries";
import { formatPhone, formatRelative } from "@/lib/format";
import type { Message } from "@/lib/db/schema";

export default async function MessagesPage() {
  const { business } = await requireBusiness();
  const rows = await listMessages(business.id);

  const inbound = rows.filter((r) => r.direction === "inbound").length;
  const outbound = rows.length - inbound;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} messages · {outbound} sent · {inbound} received
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages yet. Outbound texts (missed-call text-backs, booking
          confirmations, owner alerts, review requests) and inbound replies
          will appear here.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatRelative(row.sentAt ?? row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DirectionBadge direction={row.direction} />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{row.contactName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatPhone(
                        row.direction === "inbound"
                          ? (row.fromNumber ?? row.contactPhone)
                          : (row.toNumber ?? row.contactPhone),
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-sm whitespace-pre-wrap line-clamp-3">
                      {row.body}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
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

function DirectionBadge({ direction }: { direction: Message["direction"] }) {
  return (
    <Badge variant={direction === "outbound" ? "default" : "secondary"}>
      {direction === "outbound" ? "Sent" : "Received"}
    </Badge>
  );
}

function StatusBadge({ status }: { status: Message["status"] }) {
  const variant: Record<
    Message["status"],
    "default" | "secondary" | "destructive" | "outline"
  > = {
    queued: "outline",
    sent: "secondary",
    delivered: "default",
    failed: "destructive",
    undelivered: "destructive",
  };
  return <Badge variant={variant[status]}>{status}</Badge>;
}
