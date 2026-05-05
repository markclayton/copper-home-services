"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "pending" | "live" | "paused";

export function SetupStatusPoller({
  businessId,
  initialStatus,
}: {
  businessId: string;
  initialStatus: Status;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "live") {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/onboard/${businessId}/status`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { status: Status };
        if (cancelled) return;
        setStatus(data.status);
        if (data.status === "live") {
          clearInterval(interval);
          router.replace("/dashboard");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    }, 2_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
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

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="size-3 rounded-full bg-primary animate-pulse" />
      <span className="text-muted-foreground">Provisioning…</span>
      {error && <span className="text-destructive ml-auto">{error}</span>}
    </div>
  );
}
