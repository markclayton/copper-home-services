"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  startSubscription,
  type PlanStepState,
} from "@/app/onboard/plan/actions";
import type { SelfServePlan } from "@/lib/billing/stripe";

const INITIAL: PlanStepState = { ok: false };

const PLAN_DETAILS: Record<
  SelfServePlan,
  { label: string; price: string; tagline: string }
> = {
  solo: {
    label: "Solo",
    price: "$79/month",
    tagline: "For one-truck operations.",
  },
  business: {
    label: "Business",
    price: "$249/month",
    tagline: "For 2-10 person shops.",
  },
};

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
  initialPlan,
}: {
  businessId: string;
  initialNumber: string | null;
  initialPlan: SelfServePlan;
}) {
  const [twilioNumber, setTwilioNumber] = useState<string | null>(
    initialNumber,
  );
  const [pollError, setPollError] = useState<string | null>(null);
  const [plan, setPlan] = useState<SelfServePlan>(initialPlan);
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

  const selectedPrice = PLAN_DETAILS[plan].price;

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Almost there</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Pick how you want to start. You can change your plan or cancel any time
        from the dashboard.
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

      <div className="flex flex-col gap-3 mb-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Plan
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {(Object.keys(PLAN_DETAILS) as SelfServePlan[]).map((option) => {
            const details = PLAN_DETAILS[option];
            const active = plan === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setPlan(option)}
                className={cn(
                  "rounded-md border p-4 text-left transition-colors",
                  active
                    ? "border-primary bg-accent/40"
                    : "border-muted-foreground/20 hover:border-muted-foreground/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{details.label}</div>
                  <div
                    className={cn(
                      "size-5 rounded-full border-2 flex items-center justify-center shrink-0",
                      active
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30",
                    )}
                  >
                    {active && (
                      <Check size={12} className="text-primary-foreground" />
                    )}
                  </div>
                </div>
                <div className="text-sm mt-1">{details.price}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {details.tagline}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="withTrial" value={String(withTrial)} />
        <input type="hidden" name="plan" value={plan} />

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
                Then <span className="font-medium">{selectedPrice}</span>
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
                <span className="font-medium">{selectedPrice}</span>, billed today
              </div>
            </div>
          </div>
        </button>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="flex justify-between pt-3">
          <Button asChild variant="ghost">
            <a href="/onboard/number">Back</a>
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
