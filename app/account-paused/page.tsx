import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";
import { CopperLogo } from "@/components/copper-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoutButton } from "@/components/logout-button";
import { requireLiveOrPausedBusiness } from "@/lib/db/queries";
import { formatDate } from "@/lib/format";
import { redirect } from "next/navigation";
import { openReactivationPortal } from "./actions";

export default async function AccountPausedPage() {
  const { business } = await requireLiveOrPausedBusiness();

  // If they got here but they're actually live, bounce to dashboard.
  if (business.status === "live") redirect("/dashboard");

  const subStatus = business.stripeSubscriptionStatus;
  const teardownAt = business.scheduledTeardownAt;

  // Two reasons for pause: canceled (teardown scheduled) vs payment problem
  // (card failed). The UI message differs to give the right call to action.
  const isCanceled = subStatus === "canceled";
  const isPaymentIssue =
    subStatus === "past_due" ||
    subStatus === "unpaid" ||
    subStatus === "incomplete";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <CopperLogo className="h-8 w-auto" priority />
            <span className="font-display text-lg tracking-tight">Copper</span>
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="max-w-md w-full border-amber-500/40">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} className="text-amber-600" />
              <CardTitle className="text-base">Account paused</CardTitle>
            </div>
            <CardDescription>
              {isCanceled
                ? "Your Copper subscription was canceled. Your AI receptionist is offline and your dashboard is locked."
                : isPaymentIssue
                  ? "We weren't able to charge your card. Your dashboard is locked until billing is restored."
                  : "Your account is paused. Update your payment method to bring it back online."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isCanceled && teardownAt && (
              <div className="text-sm rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
                <div className="font-medium text-foreground">
                  Your data will be deleted on{" "}
                  {formatDate(teardownAt, business.timezone)}.
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Reactivate before then to keep your phone number, call
                  history, and customer contacts. After that date, your number
                  is released and everything is erased — we can&apos;t recover
                  it.
                </p>
              </div>
            )}
            {isPaymentIssue && (
              <div className="text-sm rounded-md border bg-muted/30 px-3 py-2 text-muted-foreground leading-relaxed">
                Stripe will keep retrying your card for the next few weeks. If
                it still fails by then, your account will switch to fully
                canceled and the data-deletion countdown will start.
              </div>
            )}

            <form action={openReactivationPortal}>
              <Button type="submit" className="w-full">
                <CreditCard size={14} className="mr-1.5" />
                {isCanceled ? "Reactivate subscription" : "Update payment method"}
              </Button>
            </form>

            <div className="text-xs text-muted-foreground text-center">
              Need help?{" "}
              <a
                href="mailto:info@joincopper.io"
                className="underline underline-offset-2 hover:text-foreground"
              >
                info@joincopper.io
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
