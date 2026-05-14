"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  flagCallAsIncorrect,
  type FlagCallState,
} from "@/app/dashboard/calls/[id]/actions";

const INITIAL: FlagCallState = { ok: false };

export function FlagCallButton({
  callId,
  alreadyFlagged,
}: {
  callId: string;
  alreadyFlagged: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    flagCallAsIncorrect,
    INITIAL,
  );

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => setOpen(false), 1200);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  if (alreadyFlagged && !open) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check size={12} /> Flagged for review
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <AlertCircle size={12} /> Flag this call
      </button>
    );
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2 max-w-sm">
      {state.ok ? (
        <div className="flex items-center gap-2 text-sm text-foreground py-1">
          <Check size={14} className="text-primary" /> Thanks — we&apos;ll
          review it.
        </div>
      ) : (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="callId" value={callId} />
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">What did the AI get wrong?</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
          <textarea
            name="reason"
            rows={3}
            required
            maxLength={500}
            placeholder="e.g., quoted the wrong price for AC tune-up"
            className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2 justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
          {state.ok === false && state.error && (
            <p className="text-xs text-destructive">{state.error}</p>
          )}
        </form>
      )}
    </div>
  );
}
