"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completeWebsiteStep,
  startCrawl,
  type WebsiteStepState,
} from "@/app/onboard/website/actions";
import type { KbCrawlJob } from "@/lib/db/schema";

const INITIAL: WebsiteStepState = { ok: false };
const POLL_MS = 3000;

type StatusJson = {
  status: KbCrawlJob["status"];
  rootUrl: string;
  pagesScraped: number;
  pagesTotal: number | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export function WebsiteStepForm({
  businessId,
  initialJob,
}: {
  businessId: string;
  initialJob: KbCrawlJob | null;
}) {
  void businessId;
  const [state, formAction, pending] = useActionState(startCrawl, INITIAL);
  const [skipPending, startSkipTransition] = useTransition();

  // The job we're tracking: either the freshly-started one or whatever
  // was already on the row when the page loaded.
  const trackingId = state.crawlJobId ?? initialJob?.id ?? null;
  const [status, setStatus] = useState<StatusJson | null>(() =>
    initialJob
      ? {
          status: initialJob.status,
          rootUrl: initialJob.rootUrl,
          pagesScraped: initialJob.pagesScraped,
          pagesTotal: initialJob.pagesTotal,
          error: initialJob.error,
          startedAt: initialJob.startedAt
            ? new Date(initialJob.startedAt).toISOString()
            : null,
          completedAt: initialJob.completedAt
            ? new Date(initialJob.completedAt).toISOString()
            : null,
        }
      : null,
  );

  useEffect(() => {
    if (!trackingId) return;
    if (status && (status.status === "ready" || status.status === "failed")) {
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/onboard/website-status/${trackingId}`);
        if (!res.ok) return;
        const json = (await res.json()) as StatusJson;
        if (!cancelled) setStatus(json);
      } catch {
        // ignore; next tick will retry
      }
    };
    void tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [trackingId, status]);

  const isCrawling =
    status &&
    status.status !== "ready" &&
    status.status !== "failed";
  const isReady = status?.status === "ready";

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
        Step 2 of 8
      </div>
      <h1 className="text-2xl font-semibold mt-1">
        Got a website? Paste it.
      </h1>
      <p className="text-sm text-muted-foreground mb-4">
        We&apos;ll read your services, pricing, and FAQs straight off it so
        you don&apos;t have to retype everything. Takes about a minute.
      </p>

      <form action={formAction} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="url">Website URL</Label>
          <Input
            id="url"
            name="url"
            type="url"
            placeholder="https://yourbusiness.com"
            defaultValue={status?.rootUrl ?? ""}
            required
            autoFocus
            disabled={pending || !!isCrawling}
          />
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || !!isCrawling}>
            {pending
              ? "Starting…"
              : isCrawling
                ? "Reading your site…"
                : "Read my site"}
          </Button>
          <button
            type="button"
            onClick={() =>
              startSkipTransition(() => {
                void completeWebsiteStep();
              })
            }
            disabled={skipPending}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {skipPending ? "Continuing…" : "Skip — I'll add things manually"}
          </button>
        </div>
      </form>

      {status && <CrawlStatusCard status={status} />}

      {isReady && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Got it. We pulled what we could from {status.rootUrl}.
          </p>
          <p className="text-xs text-emerald-900/80 dark:text-emerald-100/80 mt-1">
            Hit Continue to review what we found and edit anything that&apos;s
            off.
          </p>
          <div className="mt-3">
            <Button
              type="button"
              onClick={() =>
                startSkipTransition(() => {
                  void completeWebsiteStep();
                })
              }
              disabled={skipPending}
            >
              {skipPending ? "Continuing…" : "Continue"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CrawlStatusCard({ status }: { status: StatusJson }) {
  const label = STATUS_LABEL[status.status] ?? status.status;
  const total = status.pagesTotal ?? "?";
  const pct =
    status.pagesTotal && status.pagesTotal > 0
      ? Math.min(100, Math.round((status.pagesScraped / status.pagesTotal) * 100))
      : null;

  return (
    <div className="mt-4 rounded-md border p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">
          {status.pagesScraped}/{total} pages
        </div>
      </div>
      {pct !== null && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-foreground/80 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {status.status === "failed" && status.error && (
        <p className="text-xs text-destructive">{status.error}</p>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<KbCrawlJob["status"], string> = {
  queued: "Queued…",
  discovering: "Finding your pages…",
  fetching: "Reading pages…",
  embedding: "Reading pages…",
  ready: "Done.",
  failed: "Something went wrong.",
};
