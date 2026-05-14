import { Star } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReviewStatusBadge } from "@/components/dashboard/badges";
import { EmptyState } from "@/components/dashboard/empty-state";
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
        <EmptyState
          icon={Star}
          title={
            business.reviewRequestsEnabled
              ? "No review requests yet"
              : "Review requests are turned off"
          }
          description={
            !business.reviewRequestsEnabled
              ? "Customers get a plain thank-you text after each appointment — no review link. Turn this back on in Settings if you want to ask for Google reviews."
              : business.googleReviewUrl
                ? "After each completed appointment, we'll text the customer a review link. You'll see the status here."
                : "Add your Google review URL in Settings to start sending review requests automatically after each appointment."
          }
        />
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
