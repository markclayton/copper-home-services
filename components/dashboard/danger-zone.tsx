"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useActionState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteAccount,
  type DeleteAccountState,
} from "@/app/dashboard/settings/danger-actions";

const INITIAL: DeleteAccountState = { ok: false };

export function DangerZone({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(deleteAccount, INITIAL);
  const [pending, start] = useTransition();
  const [typed, setTyped] = useState("");

  const matches = typed.trim().toLowerCase() === businessName.trim().toLowerCase();

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle size={16} className="text-destructive" />
          Danger zone
        </CardTitle>
        <CardDescription>
          Permanently delete this account and everything in it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!open ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Cancels billing, releases your phone number, deletes the AI
              assistant, and removes every call, message, and contact. This
              cannot be undone.
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setOpen(true)}
              className="shrink-0"
            >
              <Trash2 size={14} className="mr-1.5" />
              Delete account
            </Button>
          </div>
        ) : (
          <form
            action={(fd) => start(() => formAction(fd))}
            className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4"
          >
            <div className="text-sm">
              <div className="font-medium">This is permanent.</div>
              <div className="text-muted-foreground mt-1">
                We&apos;ll cancel your Stripe subscription, release your
                Twilio phone number, delete your Vapi assistant, and remove
                every call, message, contact, and appointment. You&apos;ll be
                signed out immediately.
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirmation">
                Type <span className="font-mono font-semibold">{businessName}</span> to confirm
              </Label>
              <Input
                id="confirmation"
                name="confirmation"
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={businessName}
                disabled={pending}
              />
            </div>
            {!state.ok && state.error && (
              <div className="text-sm text-destructive">{state.error}</div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                variant="destructive"
                disabled={!matches || pending}
              >
                {pending ? "Deleting…" : "Delete forever"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  setTyped("");
                }}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
