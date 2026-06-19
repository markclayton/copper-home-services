"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneCall, PhoneOff } from "lucide-react";
import Vapi from "@vapi-ai/web";
import { Button } from "@/components/ui/button";

/**
 * In-browser test call against the tenant's deployed Vapi assistant. Same
 * assistant, same prompt, same tools — just delivered via WebRTC instead
 * of PSTN. Counts toward the tenant's monthly voice-minute cap because
 * the end-of-call-report webhook still fires.
 */

type CallState =
  | "idle"
  | "requesting-mic"
  | "connecting"
  | "in-call"
  | "ending"
  | "ended"
  | "error";

type Line = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  finalized: boolean;
};

type VapiMessage = {
  type?: string;
  role?: string;
  transcript?: string;
  transcriptType?: "partial" | "final";
  status?: string;
  [k: string]: unknown;
};

export function TestCallWidget({
  assistantId,
  publicKey,
  assistantName,
}: {
  assistantId: string | null;
  publicKey: string | null;
  assistantName: string;
}) {
  const [state, setState] = useState<CallState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [durationSec, setDurationSec] = useState(0);

  const vapiRef = useRef<Vapi | null>(null);
  const startedAtRef = useRef<number | null>(null);

  // Tick the duration counter while in-call. Cheaper than re-renders on
  // every audio frame.
  useEffect(() => {
    if (state !== "in-call") return;
    const t = setInterval(() => {
      if (startedAtRef.current) {
        setDurationSec(
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        );
      }
    }, 1000);
    return () => clearInterval(t);
  }, [state]);

  // Hard cleanup on unmount — never leave a WebRTC call dangling.
  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
      vapiRef.current = null;
    };
  }, []);

  const handleStart = async () => {
    if (!publicKey || !assistantId) return;
    setLines([]);
    setDurationSec(0);
    setErrorMessage(null);
    setState("requesting-mic");

    try {
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        startedAtRef.current = Date.now();
        setState("in-call");
      });
      vapi.on("call-end", () => {
        setState("ended");
        startedAtRef.current = null;
      });
      vapi.on("error", (err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err && "errorMsg" in err
              ? String((err as { errorMsg: unknown }).errorMsg)
              : "Something went wrong on the call.";
        setErrorMessage(message);
        setState("error");
      });
      vapi.on("message", (msg: VapiMessage) => {
        if (msg.type !== "transcript") return;
        const role = msg.role === "user" ? "user" : "assistant";
        const text = (msg.transcript ?? "").trim();
        if (!text) return;
        const finalized = msg.transcriptType === "final";

        setLines((prev) => {
          // Vapi streams partials with the same role until finalized. We
          // overwrite the last unfinalized line for that role instead of
          // pushing a new one — keeps the transcript readable.
          const last = prev[prev.length - 1];
          if (last && last.role === role && !last.finalized) {
            return [
              ...prev.slice(0, -1),
              { ...last, text, finalized },
            ];
          }
          return [
            ...prev,
            {
              id: `${Date.now()}-${prev.length}`,
              role,
              text,
              finalized,
            },
          ];
        });
      });

      setState("connecting");
      await vapi.start(assistantId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Couldn't start the call.",
      );
      setState("error");
    }
  };

  const handleStop = async () => {
    setState("ending");
    try {
      await vapiRef.current?.stop();
    } finally {
      vapiRef.current = null;
      setState("ended");
    }
  };

  const toggleMute = () => {
    if (!vapiRef.current) return;
    const next = !muted;
    vapiRef.current.setMuted(next);
    setMuted(next);
  };

  if (!publicKey || !assistantId) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">
        {!assistantId
          ? "Your assistant isn't deployed yet. Finish onboarding and come back here to test it."
          : "Test calls aren't configured for this environment. The NEXT_PUBLIC_VAPI_PUBLIC_KEY env var is missing."}
      </div>
    );
  }

  const isActive =
    state === "connecting" ||
    state === "in-call" ||
    state === "ending" ||
    state === "requesting-mic";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{assistantName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stateLabel(state)}
              {state === "in-call" && ` · ${formatDuration(durationSec)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {state === "in-call" && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff size={16} /> : <Mic size={16} />}
              </Button>
            )}
            {isActive ? (
              <Button onClick={handleStop} variant="destructive">
                <PhoneOff size={16} className="mr-2" /> End call
              </Button>
            ) : (
              <Button onClick={handleStart}>
                <PhoneCall size={16} className="mr-2" /> Start test call
              </Button>
            )}
          </div>
        </div>

        {errorMessage && state === "error" && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}

        <TranscriptStream lines={lines} active={isActive} />
      </div>

      <p className="text-xs text-muted-foreground">
        Test calls run against your real, deployed assistant — same prompt,
        same tools, same knowledge base. They count toward your monthly
        voice-minute usage just like a phone call would.
      </p>
    </div>
  );
}

function TranscriptStream({
  lines,
  active,
}: {
  lines: Line[];
  active: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  if (lines.length === 0 && !active) {
    return (
      <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Click Start to talk to your AI receptionist. The transcript will show
        up here.
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="rounded-md border bg-muted/30 p-4 max-h-[320px] overflow-y-auto flex flex-col gap-3"
    >
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Listening…</p>
      ) : (
        lines.map((line) => (
          <div key={line.id} className="flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {line.role === "user" ? "You" : "AI"}
            </div>
            <div
              className={
                line.finalized ? "text-sm" : "text-sm text-muted-foreground italic"
              }
            >
              {line.text}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function stateLabel(state: CallState): string {
  switch (state) {
    case "idle":
      return "Ready";
    case "requesting-mic":
      return "Asking for microphone…";
    case "connecting":
      return "Connecting…";
    case "in-call":
      return "Connected";
    case "ending":
      return "Hanging up…";
    case "ended":
      return "Call ended";
    case "error":
      return "Error";
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
