"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  saveServicesStep,
  skipServicesStep,
  type ServicesStepState,
} from "@/app/onboard/services/actions";
import { ServicesEditor, type ServiceRow } from "./services-editor";
import { FaqsEditor, type FaqRow } from "./faqs-editor";
import type { KnowledgeBase } from "@/lib/db/schema";

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

  const [saveState, saveAction, saving] = useActionState(
    saveServicesStep,
    SAVE_INITIAL,
  );

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Services and FAQs</h1>
      <p className="text-sm text-muted-foreground mb-4">
        What you offer, and the questions callers always ask. The AI uses
        these to answer customers directly without bothering you. You can
        skip this and come back later — your dashboard will remind you.
      </p>

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

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button asChild variant="ghost">
            <a href="/onboard/business">Back</a>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="ghost"
              formAction={skipServicesStep}
              disabled={saving}
            >
              Skip for now
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Continue"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
