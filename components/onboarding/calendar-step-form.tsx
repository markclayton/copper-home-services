"use client";

import { useTransition } from "react";
import { Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  advanceFromCalendar,
  skipCalendarStep,
} from "@/app/onboard/calendar/actions";
import type { Business } from "@/lib/db/schema";

const ERROR_MESSAGES: Record<string, string> = {
  denied: "You declined the permissions Copper needs. Try again or skip for now.",
  state_mismatch: "Your session expired. Try connecting again.",
  no_refresh_token:
    "Google didn't return a refresh token. Revoke Copper at myaccount.google.com → Security → Third-party access, then reconnect.",
  token_exchange_failed: "Google rejected the authorization. Try again.",
  not_configured: "Calendar integration isn't configured on this deployment.",
  missing_params: "Something went wrong with the redirect. Try again.",
};

export function CalendarStepForm({
  business,
  errorParam,
  successParam,
}: {
  business: Business;
  errorParam: string | null;
  successParam: boolean;
}) {
  const [pending, start] = useTransition();
  const connected = business.calendarProvider === "google";
  const errorMsg = errorParam ? (ERROR_MESSAGES[errorParam] ?? errorParam) : null;

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Connect your calendar</h1>
      <p className="text-sm text-muted-foreground mb-4">
        When the AI books an appointment, it goes straight onto your calendar
        — and it won&apos;t offer times you&apos;re already busy. You can skip
        this for now and connect later from Settings.
      </p>

      {successParam && !errorMsg && !connected && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 mb-2">
          Connected. Almost done.
        </div>
      )}
      {errorMsg && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-2">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border p-4">
        <div className="flex items-start gap-3">
          <Calendar size={20} className="mt-0.5 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium flex items-center gap-2">
              Google Calendar
              {connected && (
                <CheckCircle2 size={14} className="text-emerald-600" />
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {connected
                ? `Connected as ${business.calendarAccountEmail ?? "your Google account"}`
                : "We'll request permission to view your availability and create events."}
            </div>
          </div>
        </div>
        {connected ? (
          <span className="text-xs text-emerald-600 font-medium">Connected</span>
        ) : (
          <Button asChild size="sm">
            <a href="/api/integrations/google-calendar/connect?return_to=/onboard/calendar">
              Connect
            </a>
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border p-4 opacity-60">
        <div className="flex items-start gap-3">
          <Calendar size={20} className="mt-0.5 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">Microsoft Outlook</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Coming soon.
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" disabled>
          Not yet available
        </Button>
      </div>

      <div className="flex justify-between pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => start(() => skipCalendarStep())}
          disabled={pending}
        >
          {pending ? "…" : "Skip for now"}
        </Button>
        <Button
          type="button"
          onClick={() => start(() => advanceFromCalendar())}
          disabled={pending || !connected}
        >
          {pending ? "…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
