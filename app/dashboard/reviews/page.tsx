import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReviewStatusBadge } from "@/components/dashboard/badges";
import { listReviewRequests, requireBusiness } from "@/lib/db/queries";
import { formatPhone, formatRelative } from "@/lib/format";

export default async function ReviewsPage() {
  const { business } = await requireBusiness();
  const rows = await listReviewRequests(business.id);

  const stats = rows.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { pending: 0, sent: 0, clicked: 0, completed: 0 } as Record<
      string,
      number
    >,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Sent {stats.sent} · Clicked {stats.clicked} · Completed{" "}
          {stats.completed}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No review requests yet. They auto-fire 2 hours after each appointment ends.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Clicked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div>{row.contactName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatPhone(row.contactPhone)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ReviewStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelative(row.sentAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelative(row.clickedAt)}
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
