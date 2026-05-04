"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  startSubscription,
  type PlanStepState,
} from "@/app/onboard/plan/actions";

const INITIAL: PlanStepState = { ok: false };

function formatPhone(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function PlanStepForm({
  businessId,
  initialNumber,
}: {
  businessId: string;
  initialNumber: string | null;
}) {
  const [twilioNumber, setTwilioNumber] = useState<string | null>(
    initialNumber,
  );
  const [pollError, setPollError] = useState<string | null>(null);
  const [withTrial, setWithTrial] = useState(true);
  const [state, formAction, pending] = useActionState(
    startSubscription,
    INITIAL,
  );

  useEffect(() => {
    if (twilioNumber) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/onboard/${businessId}/provisioning-status`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { twilioNumber: string | null };
        if (cancelled) return;
        if (data.twilioNumber) {
          setTwilioNumber(data.twilioNumber);
          clearInterval(interval);
        }
      } catch (err) {
        if (cancelled) return;
        setPollError(err instanceof Error ? err.message : String(err));
      }
    }, 2_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [businessId, twilioNumber]);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Almost there</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Pick how you want to start. You can cancel any time from the dashboard.
      </p>

      <div
        className={cn(
          "rounded-md border p-4 transition-colors mb-4",
          twilioNumber
            ? "bg-accent/30 border-accent"
            : "bg-muted/30 border-muted-foreground/20",
        )}
      >
        <div className="flex items-start gap-3">
          <Phone size={20} className="mt-0.5 shrink-0" />
          <div>
            {twilioNumber ? (
              <>
                <div className="font-medium">
                  Your number: {formatPhone(twilioNumber)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Reserved for you. Pick a plan below to keep it.
                </p>
              </>
            ) : (
              <>
                <div className="font-medium flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                  Reserving your phone number…
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This usually takes 10-30 seconds.
                </p>
              </>
            )}
          </div>
        </div>
        {pollError && (
          <p className="text-xs text-destructive mt-2">{pollError}</p>
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="withTrial" value={String(withTrial)} />

        <button
          type="button"
          onClick={() => setWithTrial(true)}
          className={cn(
            "rounded-md border p-4 text-left transition-colors",
            withTrial
              ? "border-primary bg-accent/40"
              : "border-muted-foreground/20 hover:border-muted-foreground/40",
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "size-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0",
                withTrial ? "border-primary bg-primary" : "border-muted-foreground/30",
              )}
            >
              {withTrial && (
                <Check size={12} className="text-primary-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium">Start 7-day free trial</div>
              <p className="text-xs text-muted-foreground mt-1">
                Try Copper free for a week. Card required, but you won&apos;t
                be charged until day 7. Cancel any time.
              </p>
              <div className="text-xs mt-2">
                Then <span className="font-medium">$500/month</span>
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setWithTrial(false)}
          className={cn(
            "rounded-md border p-4 text-left transition-colors",
            !withTrial
              ? "border-primary bg-accent/40"
              : "border-muted-foreground/20 hover:border-muted-foreground/40",
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "size-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0",
                !withTrial ? "border-primary bg-primary" : "border-muted-foreground/30",
              )}
            >
              {!withTrial && (
                <Check size={12} className="text-primary-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium">Subscribe now</div>
              <p className="text-xs text-muted-foreground mt-1">
                Skip the trial and start using Copper today.
              </p>
              <div className="text-xs mt-2">
                <span className="font-medium">$500/month</span>, billed today
              </div>
            </div>
          </div>
        </button>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="flex justify-between pt-3">
          <Button asChild variant="ghost">
            <a href="/onboard/voice">Back</a>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? "Redirecting to checkout…"
              : withTrial
                ? "Start free trial"
                : "Continue to payment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
