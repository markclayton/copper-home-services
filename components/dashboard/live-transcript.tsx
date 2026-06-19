"use client";

import { useEffect, useRef, useState } from "react";

const POLL_MS = 1500;
const STOP_STATES = new Set(["completed", "failed", "no_answer", "voicemail"]);

type Segment = {
  id: string;
  role: string;
  text: string;
  timeOffsetMs: number;
  createdAt: string;
};

type PollResponse = {
  status: string;
  segments: Segment[];
};

export function LiveTranscript({
  callId,
  initialSegments,
}: {
  callId: string;
  initialSegments: Segment[];
}) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sinceRef = useRef<string>(
    initialSegments.length > 0
      ? initialSegments[initialSegments.length - 1].createdAt
      : new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  );

  useEffect(() => {
    if (done) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/dashboard/calls/${callId}/transcript?since=${encodeURIComponent(sinceRef.current)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as PollResponse;
        if (cancelled) return;

        if (json.segments.length > 0) {
          setSegments((prev) => mergeSegments(prev, json.segments));
          sinceRef.current = json.segments[json.segments.length - 1].createdAt;
        }
        if (STOP_STATES.has(json.status)) {
          setDone(true);
        }
      } catch {
        // transient — try again next tick
      }
    };

    void tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [callId, done]);

  // Auto-scroll on new content so the operator always sees the latest.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [segments.length]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            done ? "bg-muted-foreground" : "bg-red-500 animate-pulse"
          }`}
        />
        <span className="text-muted-foreground">
          {done ? "Call ended" : "Live — updating in real time"}
        </span>
      </div>
      <div
        ref={containerRef}
        className="rounded-md border bg-muted/30 p-4 max-h-[400px] overflow-y-auto flex flex-col gap-3 text-sm"
      >
        {segments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Waiting for the first words…
          </p>
        ) : (
          segments.map((s) => (
            <div
              key={s.id}
              className="flex flex-col sm:flex-row gap-1 sm:gap-3"
            >
              <div className="sm:w-20 shrink-0 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {s.role}
              </div>
              <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                {s.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Merge new segments into the existing list, dedup by id. The webhook
 * dedups too but we still defend against an overlapping `since` cursor
 * landing the same row twice from back-to-back polls.
 */
function mergeSegments(prev: Segment[], incoming: Segment[]): Segment[] {
  const seen = new Set(prev.map((s) => s.id));
  const merged = [...prev];
  for (const s of incoming) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    merged.push(s);
  }
  // Order by timeOffsetMs so out-of-order Vapi events still render
  // in conversational order.
  merged.sort((a, b) => a.timeOffsetMs - b.timeOffsetMs);
  return merged;
}
