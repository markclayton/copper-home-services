import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireBusiness } from "@/lib/db/queries";
import { formatDateTime } from "@/lib/format";
import {
  openCustomerPortal,
  startCheckout,
} from "./actions";

type SearchParams = { status?: string };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { business } = await requireBusiness();
  const params = await searchParams;

  const hasCustomer = !!business.stripeCustomerId;
  const hasSubscription = !!business.stripeSubscriptionId;
  const status = business.stripeSubscriptionStatus;
  const setupPaid = !!business.setupFeePaidAt;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Setup fee + monthly subscription. Manage cards and invoices in the
          Stripe portal.
        </p>
      </div>

      {params.status === "success" && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Payment received. Your subscription is being activated — refresh in a
          moment to see the latest status.
        </p>
      )}
      {params.status === "canceled" && (
        <p className="text-sm text-muted-foreground">
          Checkout canceled. Try again whenever you&apos;re ready.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>
              {hasSubscription
                ? "Active billing relationship"
                : "Not yet activated"}
            </CardDescription>
          </div>
          {status && <SubscriptionBadge status={status} />}
        </CardHeader>
        <CardContent className="grid gap-4">
          <Row
            label="Setup fee"
            value={
              setupPaid
                ? `Paid ${formatDateTime(business.setupFeePaidAt, business.timezone)}`
                : "Unpaid"
            }
          />
          <Row
            label="Monthly subscription"
            value={status ?? (hasSubscription ? "active" : "—")}
          />
          <Row
            label="Stripe customer"
            value={business.stripeCustomerId ?? "not yet created"}
            mono
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {!hasCustomer ? (
            <p className="text-sm text-muted-foreground">
              Your operator needs to finish provisioning before billing can be
              activated.
            </p>
          ) : !hasSubscription ? (
            <form action={startCheckout}>
              <Button type="submit">Activate billing</Button>
            </form>
          ) : (
            <form action={openCustomerPortal}>
              <Button type="submit" variant="outline">
                Manage billing
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs" : undefined}>{value}</div>
    </div>
  );
}

function SubscriptionBadge({ status }: { status: string }) {
  const variant =
    status === "active" || status === "trialing"
      ? "default"
      : status === "past_due" || status === "unpaid"
        ? "destructive"
        : status === "canceled"
          ? "outline"
          : "secondary";
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}
