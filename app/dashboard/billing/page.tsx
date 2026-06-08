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
import { getUsageSnapshot } from "@/lib/billing/usage";
import { type PlanTier } from "@/lib/billing/plans";
import {
  openCustomerPortal,
  startCheckout,
} from "./actions";

const TIER_LABEL: Record<PlanTier, string> = {
  default: "Solo",
  solo: "Solo",
  business: "Business",
  custom: "Custom",
};

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
  const tier = business.planTier as PlanTier;
  const usage = await getUsageSnapshot(business.id, tier);

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
          <CardTitle>Voice usage</CardTitle>
          <CardDescription>
            Minutes answered by your AI in the last 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Row label="Plan" value={TIER_LABEL[tier]} />
          <Row
            label="Minutes used"
            value={
              usage.minuteCap
                ? `${usage.minutesUsed} of ${usage.minuteCap}`
                : `${usage.minutesUsed} (no cap)`
            }
          />
          {usage.minuteCap && (
            <UsageBar
              used={usage.minutesUsed}
              cap={usage.minuteCap}
              pct={usage.pctUsed ?? 0}
            />
          )}
          {usage.pctUsed !== null && usage.pctUsed >= 0.8 && (
            <p className="text-sm text-muted-foreground">
              {usage.pctUsed >= 1
                ? "You've reached your monthly minutes. Calls are still being answered — upgrade to Business for higher capacity."
                : "Approaching your monthly cap. Upgrade to Business for more headroom."}
            </p>
          )}
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

function UsageBar({
  used,
  cap,
  pct,
}: {
  used: number;
  cap: number;
  pct: number;
}) {
  const clamped = Math.min(1, Math.max(0, pct));
  const widthPct = Math.round(clamped * 100);
  const tone =
    clamped >= 1
      ? "bg-red-500"
      : clamped >= 0.8
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="grid gap-1">
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${tone}`}
          style={{ width: `${widthPct}%` }}
          aria-label={`${used} of ${cap} minutes used`}
        />
      </div>
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
