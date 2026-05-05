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
import { ServicesEditor, type ServiceRow } from "./services-editor";
import { FaqsEditor, type FaqRow } from "./faqs-editor";
import type { KnowledgeBase } from "@/lib/db/schema";

const DRAFT_INITIAL: ServicesDraftState = { ok: false };
const SAVE_INITIAL: ServicesStepState = { ok: false };

function asServices(value: unknown): ServiceRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      name: typeof v.name === "string" ? v.name : "",
      description: typeof v.description === "string" ? v.description : "",
      priceRange: typeof v.priceRange === "string" ? v.priceRange : "",
      typicalDuration:
        typeof v.typicalDuration === "string" ? v.typicalDuration : "",
    }));
}

function asFaqs(value: unknown): FaqRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      q: typeof v.q === "string" ? v.q : "",
      a: typeof v.a === "string" ? v.a : "",
    }));
}

export function ServicesStepForm({ kb }: { kb: KnowledgeBase | null }) {
  const [services, setServices] = useState<ServiceRow[]>(
    asServices(kb?.services),
  );
  const [faqs, setFaqs] = useState<FaqRow[]>(asFaqs(kb?.faqs));

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
    if (d.services?.length) setServices(asServices(d.services));
    if (d.faqs?.length) setFaqs(asFaqs(d.faqs));
  }

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Services and FAQs</h1>
      <p className="text-sm text-muted-foreground mb-4">
        What you offer, and the questions callers always ask. Use the AI
        drafter if you have a website to save typing.
      </p>

      <form
        action={draftAction}
        className="rounded-md border bg-muted/30 p-4 mb-2"
      >
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

      <form action={saveAction} className="flex flex-col gap-6">
        <input type="hidden" name="services" value={JSON.stringify(services)} />
        <input type="hidden" name="faqs" value={JSON.stringify(faqs)} />

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">Services</Label>
          <p className="text-xs text-muted-foreground">
            What you offer, with rough pricing. The AI quotes only what&apos;s
            here.
          </p>
          <ServicesEditor value={services} onChange={setServices} />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">FAQs</Label>
          <p className="text-xs text-muted-foreground">
            Common questions callers ask. The AI uses these to answer
            directly without escalating.
          </p>
          <FaqsEditor value={faqs} onChange={setFaqs} />
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
