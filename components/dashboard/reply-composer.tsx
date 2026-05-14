"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  sendOwnerReply,
  type ReplyState,
} from "@/app/dashboard/messages/[contactId]/actions";

const INITIAL: ReplyState = { ok: false };

export function ReplyComposer({
  contactId,
  aiPaused,
}: {
  contactId: string;
  aiPaused: boolean;
}) {
  const [state, formAction, pending] = useActionState(sendOwnerReply, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      textareaRef.current?.focus();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border bg-card p-3 space-y-2"
    >
      <input type="hidden" name="contactId" value={contactId} />
      <textarea
        ref={textareaRef}
        name="body"
        rows={2}
        required
        maxLength={1000}
        placeholder={
          aiPaused
            ? "AI is paused for this contact. Your replies go out as you."
            : "Send a reply. The AI is still active — pause it above if you want to take over fully."
        }
        className="w-full resize-none rounded-md border-0 bg-transparent px-1 py-1 text-sm focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground"
        onKeyDown={(e) => {
          // Cmd/Ctrl+Enter to send.
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {!aiPaused && (
            <span>
              <kbd className="font-mono">⌘↵</kbd> to send.
            </span>
          )}
          {state.ok === false && state.error && (
            <span className="text-destructive">{state.error}</span>
          )}
          {state.ok && (
            <span className="text-primary">Sent.</span>
          )}
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          <Send size={14} className="mr-1" />
          {pending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
