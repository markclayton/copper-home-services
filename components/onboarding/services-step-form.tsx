"use client";

import { useActionState, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  draftFromUrlAction,
  saveServicesStep,
  type ServicesDraftState,
  type ServicesStepState,
} from "@/app/onboard/services/actions";
import type { KnowledgeBase } from "@/lib/db/schema";

const DRAFT_INITIAL: ServicesDraftState = { ok: false };
const SAVE_INITIAL: ServicesStepState = { ok: false };

const SAMPLE_SERVICES = JSON.stringify(
  [
    {
      name: "AC repair",
      priceRange: "$150 + parts",
      typicalDuration: "1–2 hours",
    },
  ],
  null,
  2,
);

const SAMPLE_FAQS = JSON.stringify(
  [{ q: "Are you licensed?", a: "Yes." }],
  null,
  2,
);

function pretty(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  const arr = Array.isArray(value) ? value : [];
  if (arr.length === 0 && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value).length === 0
      ? fallback
      : JSON.stringify(value, null, 2);
  }
  return JSON.stringify(value, null, 2);
}

export function ServicesStepForm({ kb }: { kb: KnowledgeBase | null }) {
  const [services, setServices] = useState<string>(
    pretty(kb?.services, SAMPLE_SERVICES),
  );
  const [faqs, setFaqs] = useState<string>(pretty(kb?.faqs, SAMPLE_FAQS));

  const [draftState, draftAction, drafting] = useActionState(
    draftFromUrlAction,
    DRAFT_INITIAL,
  );
  const [saveState, saveAction, saving] = useActionState(
    saveServicesStep,
    SAVE_INITIAL,
  );
  const lastDraftRef = useRef<ServicesDraftState | null>(null);

  if (draftState.ok && draftState.draft && draftState !== lastDraftRef.current) {
    lastDraftRef.current = draftState;
    const d = draftState.draft;
    if (d.services?.length)
      setServices(JSON.stringify(d.services, null, 2));
    if (d.faqs?.length) setFaqs(JSON.stringify(d.faqs, null, 2));
  }

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Services and FAQs</h1>
      <p className="text-sm text-muted-foreground mb-4">
        What you offer, and the questions callers always ask. Use the AI
        drafter if you have a website to save typing.
      </p>

      <form action={draftAction} className="rounded-md border bg-muted/30 p-4 mb-2">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label htmlFor="websiteUrl" className="flex items-center gap-1.5">
              <Sparkles size={14} /> Draft from your website (optional)
            </Label>
            <Input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              placeholder="https://your-business.com"
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={drafting} variant="outline">
            {drafting ? "Reading…" : "Draft"}
          </Button>
        </div>
        {draftState.error && (
          <p className="text-sm text-destructive mt-2">{draftState.error}</p>
        )}
        {draftState.ok && (
          <p className="text-xs text-muted-foreground mt-2">
            Draft generated — review and edit below before continuing.
          </p>
        )}
      </form>

      <form action={saveAction} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="services">Services</Label>
          <textarea
            id="services"
            name="services"
            rows={8}
            value={services}
            onChange={(e) => setServices(e.target.value)}
            className="rounded-md border bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Each service: name, optional priceRange, optional typicalDuration.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="faqs">FAQs</Label>
          <textarea
            id="faqs"
            name="faqs"
            rows={8}
            value={faqs}
            onChange={(e) => setFaqs(e.target.value)}
            className="rounded-md border bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {saveState.error && (
          <p className="text-sm text-destructive">{saveState.error}</p>
        )}

        <div className="flex justify-between pt-2">
          <Button asChild variant="ghost">
            <a href="/onboard/business">Back</a>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
