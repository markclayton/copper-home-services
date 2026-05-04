"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  saveVoiceStep,
  type VoiceStepState,
} from "@/app/onboard/voice/actions";
import type { KnowledgeBase } from "@/lib/db/schema";

const INITIAL: VoiceStepState = { ok: false };

export function VoiceStepForm({ kb }: { kb: KnowledgeBase | null }) {
  const [state, formAction, pending] = useActionState(saveVoiceStep, INITIAL);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Voice and emergencies</h1>
      <p className="text-sm text-muted-foreground mb-4">
        How should the AI sound, and what counts as an emergency? You can edit
        all of this later in Settings.
      </p>

      <form action={formAction} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="brandVoiceNotes">Brand voice</Label>
          <textarea
            id="brandVoiceNotes"
            name="brandVoiceNotes"
            rows={3}
            defaultValue={kb?.brandVoiceNotes ?? ""}
            placeholder="Warm, professional, plain-spoken. No jargon unless the caller uses it first."
            className="rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            One or two sentences describing how your AI should sound on the
            phone.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="emergencyCriteria">What counts as an emergency?</Label>
          <textarea
            id="emergencyCriteria"
            name="emergencyCriteria"
            rows={3}
            defaultValue={kb?.emergencyCriteria ?? ""}
            placeholder="No heat in winter, gas smell, water leak, electrical sparking, frozen pipes."
            className="rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            When the AI hears these, it texts you immediately.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="voicemailScript">
            Voicemail script (optional)
          </Label>
          <textarea
            id="voicemailScript"
            name="voicemailScript"
            rows={2}
            defaultValue={kb?.voicemailScript ?? ""}
            placeholder="You've reached Acme HVAC. Please leave your name, address, and the issue."
            className="rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="flex justify-between pt-2">
          <Button asChild variant="ghost">
            <a href="/onboard/hours">Back</a>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Setting up your AI…" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
