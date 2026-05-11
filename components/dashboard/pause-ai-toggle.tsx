"use client";

import { useActionState, useTransition } from "react";
import { Pause, Play } from "lucide-react";
import {
  toggleAiPause,
  type PauseState,
} from "@/app/dashboard/messages/[contactId]/actions";

const INITIAL: PauseState = { ok: false };

export function PauseAiToggle({
  contactId,
  paused: initialPaused,
}: {
  contactId: string;
  paused: boolean;
}) {
  const [state, formAction] = useActionState(toggleAiPause, INITIAL);
  const [pending, start] = useTransition();

  // Optimistic display: rely on the action's revalidatePath to update the
  // prop on the next render; show pending state via useTransition during flight.
  const paused = state.ok ? state.paused : initialPaused;

  return (
    <form
      action={(fd) => start(() => formAction(fd))}
      className="inline-flex"
    >
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="paused" value={paused ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
          paused
            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
            : "bg-background border-input hover:bg-accent text-foreground"
        } disabled:opacity-60`}
      >
        {paused ? (
          <>
            <Play size={12} /> Resume AI
          </>
        ) : (
          <>
            <Pause size={12} /> Pause AI
          </>
        )}
      </button>
    </form>
  );
}
