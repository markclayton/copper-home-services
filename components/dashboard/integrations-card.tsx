"use client";

import { useTransition } from "react";
import { Calendar, CheckCircle2, Plug } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { disconnectGoogleCalendar } from "@/app/dashboard/settings/integration-actions";

const ERROR_MESSAGES: Record<string, string> = {
  denied: "You declined the permissions Copper needs to read your availability and create events.",
  state_mismatch: "Your sign-in session expired. Try connecting again.",
  no_refresh_token:
    "Google didn't return a refresh token. Revoke Copper at myaccount.google.com → Security → Third-party access, then reconnect.",
  token_exchange_failed:
    "Google rejected the authorization. Try connecting again, or contact support if this keeps happening.",
  not_configured: "Google Calendar isn't configured on this deployment.",
  no_business: "Finish onboarding before connecting your calendar.",
  missing_params: "Something went wrong with the redirect. Try again.",
};

export type IntegrationStatus = {
  provider: "google" | "microsoft" | null;
  accountEmail: string | null;
  connectedAt: Date | null;
};

export function IntegrationsCard({
  status,
  errorParam,
  successParam,
}: {
  status: IntegrationStatus;
  errorParam: string | null;
  successParam: boolean;
}) {
  const [pending, start] = useTransition();

  const connected = status.provider === "google";
  const errorMsg = errorParam ? (ERROR_MESSAGES[errorParam] ?? errorParam) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plug size={16} />
          Integrations
        </CardTitle>
        <CardDescription>
          Connect your calendar so the AI can quote real openings and book
          appointments straight onto it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {successParam && !errorMsg && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            Connected. The AI can now see your schedule and book appointments.
          </div>
        )}
        {errorMsg && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
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
                  ? `Connected as ${status.accountEmail ?? "your Google account"}`
                  : "Not connected — the AI can't book appointments yet."}
              </div>
            </div>
          </div>
          {connected ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => start(() => disconnectGoogleCalendar())}
            >
              {pending ? "Disconnecting…" : "Disconnect"}
            </Button>
          ) : (
            <Button asChild size="sm">
              <a href="/api/integrations/google-calendar/connect">Connect</a>
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

      </CardContent>
    </Card>
  );
}
