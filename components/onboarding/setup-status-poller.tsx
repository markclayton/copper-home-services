"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "pending" | "live" | "paused";

// Provisioning usually completes in 30–60s. After this many polls we stop
// and show a recovery message — better than spinning forever.
const POLL_INTERVAL_MS = 2_000;
const TIMEOUT_AFTER_MS = 4 * 60 * 1000; // 4 minutes

export function SetupStatusPoller({
  businessId,
  initialStatus,
}: {
  businessId: string;
  initialStatus: Status;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [transientError, setTransientError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (status === "live") {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    const tick = setInterval(() => {
      if (cancelled) return;
      setElapsedMs(Date.now() - startedAt);
    }, 1000);

    const interval = setInterval(async () => {
      if (cancelled) return;

      if (Date.now() - startedAt > TIMEOUT_AFTER_MS) {
        setTimedOut(true);
        clearInterval(interval);
        clearInterval(tick);
        return;
      }

      try {
        const res = await fetch(`/api/onboard/${businessId}/status`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { status: Status };
        if (cancelled) return;
        setTransientError(null);
        setStatus(data.status);
        if (data.status === "live") {
          clearInterval(interval);
          clearInterval(tick);
          router.replace("/dashboard");
        }
      } catch (err) {
        if (cancelled) return;
        setTransientError(err instanceof Error ? err.message : String(err));
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(tick);
    };
  }, [businessId, status, router]);

  if (status === "live") {
    return (
      <div className="rounded-md border bg-accent/30 p-4 text-sm">
        <div className="font-medium">You&apos;re live.</div>
        <p className="text-muted-foreground mt-1">
          Taking you to your dashboard…
        </p>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-3">
        <div className="font-medium text-foreground">
          This is taking longer than usual.
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Setup normally finishes in under a minute. Yours has been running for
          a few minutes — usually that means a provider (Twilio, Vapi) is
          slow to respond. Email us with your business name and we&apos;ll
          jump in directly.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href="mailto:info@joincopper.io?subject=Setup%20stuck"
            className="inline-flex items-center text-sm font-medium underline underline-offset-4 hover:text-foreground"
          >
            Email info@joincopper.io
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Refresh and keep waiting
          </button>
        </div>
      </div>
    );
  }

  const seconds = Math.floor(elapsedMs / 1000);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-3">
        <div className="size-3 rounded-full bg-primary animate-pulse" />
        <span className="text-muted-foreground">
          Provisioning… {seconds > 0 && `(${seconds}s)`}
        </span>
      </div>
      {transientError && (
        <p className="text-xs text-muted-foreground">
          Briefly couldn&apos;t check status — retrying.
        </p>
      )}
    </div>
  );
}
