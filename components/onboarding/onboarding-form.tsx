"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  draftKbAction,
  submitOnboarding,
  type DraftKbState,
  type SubmitOnboardingState,
} from "@/app/onboard/actions";

const DRAFT_INITIAL: DraftKbState = { ok: false };

const INITIAL: SubmitOnboardingState = { ok: false };

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];
type HoursDay = { open: string; close: string; closed?: boolean };
type Hours = Record<DayKey, HoursDay>;

const DEFAULT_HOURS: Hours = {
  mon: { open: "08:00", close: "18:00" },
  tue: { open: "08:00", close: "18:00" },
  wed: { open: "08:00", close: "18:00" },
  thu: { open: "08:00", close: "18:00" },
  fri: { open: "08:00", close: "18:00" },
  sat: { open: "09:00", close: "14:00" },
  sun: { open: "", close: "", closed: true },
};

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

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(submitOnboarding, INITIAL);
  const [draftState, draftFormAction, drafting] = useActionState(
    draftKbAction,
    DRAFT_INITIAL,
  );
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  const [services, setServices] = useState<string>(SAMPLE_SERVICES);
  const [faqs, setFaqs] = useState<string>(SAMPLE_FAQS);
  const [pricing, setPricing] = useState<string>("{}");
  const [policies, setPolicies] = useState<string>("{}");
  const [emergencyCriteria, setEmergencyCriteria] = useState<string>("");
  const [brandVoiceNotes, setBrandVoiceNotes] = useState<string>("");
  const lastDraftRef = useRef<DraftKbState | null>(null);

  if (draftState.ok && draftState.draft && draftState !== lastDraftRef.current) {
    lastDraftRef.current = draftState;
    const d = draftState.draft;
    setServices(JSON.stringify(d.services, null, 2));
    setFaqs(JSON.stringify(d.faqs, null, 2));
    if (d.pricing && Object.keys(d.pricing).length > 0) {
      setPricing(JSON.stringify(d.pricing, null, 2));
    }
    if (d.policies && Object.keys(d.policies).length > 0) {
      setPolicies(JSON.stringify(d.policies, null, 2));
    }
    if (d.emergencyCriteria) setEmergencyCriteria(d.emergencyCriteria);
    if (d.brandVoiceNotes) setBrandVoiceNotes(d.brandVoiceNotes);
  }

  function updateDay(day: DayKey, patch: Partial<HoursDay>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Draft from your website (optional)</CardTitle>
          <CardDescription>
            Paste your website URL — we&apos;ll pre-fill services, FAQs, and
            voice notes from your site so you can review instead of write from
            scratch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={draftFormAction} className="flex flex-col gap-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  name="websiteUrl"
                  type="url"
                  placeholder="https://your-business.com"
                  required
                />
              </div>
              <Button type="submit" disabled={drafting} variant="outline">
                {drafting ? "Drafting…" : "Draft from URL"}
              </Button>
            </div>
            {draftState.ok && draftState.draft && (
              <p className="text-sm text-muted-foreground">
                Draft generated — review and edit the JSON sections below
                before submitting.
              </p>
            )}
            {draftState.error && (
              <p className="text-sm text-destructive">{draftState.error}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <form action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="hours" value={JSON.stringify(hours)} />
        <input type="hidden" name="services" value={services} />
        <input type="hidden" name="faqs" value={faqs} />
        <input type="hidden" name="pricing" value={pricing} />
        <input type="hidden" name="policies" value={policies} />

      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Business name" name="name" required />
          <Field
            label="Time zone"
            name="timezone"
            required
            defaultValue="America/Los_Angeles"
          />
          <Field label="Owner name" name="ownerName" required />
          <Field label="Owner email" name="ownerEmail" type="email" required />
          <Field label="Owner cell phone" name="ownerPhone" required />
          <Field label="Existing CRM (if any)" name="existingCrm" placeholder="Housecall Pro / Jobber / ServiceM8 / None" />
          <Field label="Main business phone (if different)" name="phoneMain" />
          <Field label="Forwarding phone" name="phoneForwarding" />
          <div className="md:col-span-2">
            <Field
              label="Service area ZIPs (comma-separated)"
              name="serviceAreaZips"
            />
          </div>
          <div className="md:col-span-2">
            <Field
              label="Google Business Profile URL"
              name="googleReviewUrl"
              type="url"
              placeholder="https://g.page/r/..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hours</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {DAYS.map(({ key, label }) => {
            const day = hours[key];
            return (
              <div
                key={key}
                className="grid grid-cols-[60px_1fr_1fr_120px] gap-3 items-center"
              >
                <Label className="font-medium">{label}</Label>
                <Input
                  type="time"
                  value={day.open}
                  onChange={(e) => updateDay(key, { open: e.target.value })}
                  disabled={day.closed}
                />
                <Input
                  type="time"
                  value={day.close}
                  onChange={(e) => updateDay(key, { close: e.target.value })}
                  disabled={day.closed}
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!day.closed}
                    onCheckedChange={(checked) =>
                      updateDay(key, { closed: !!checked })
                    }
                  />
                  Closed
                </label>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge base</CardTitle>
          <CardDescription>
            JSON for V1. Your operator will polish this before going live.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Json label="Services" value={services} onChange={setServices} />
          <Json label="FAQs" value={faqs} onChange={setFaqs} />
          <Json label="Pricing" value={pricing} onChange={setPricing} />
          <Json label="Policies" value={policies} onChange={setPolicies} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice & behavior</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Textarea
            label="Brand voice notes"
            name="brandVoiceNotes"
            placeholder="Warm, professional, no jargon."
            rows={2}
            value={brandVoiceNotes}
            onChange={setBrandVoiceNotes}
          />
          <Textarea
            label="What counts as an emergency?"
            name="emergencyCriteria"
            placeholder="No heat in winter, gas smell, water leak..."
            rows={3}
            value={emergencyCriteria}
            onChange={setEmergencyCriteria}
          />
          <Textarea
            label="Voicemail script"
            name="voicemailScript"
            rows={2}
          />
          <Textarea
            label="After-hours policy"
            name="afterHoursPolicy"
            rows={2}
          />
          <Field
            label="Quote callback window"
            name="quoteCallbackWindow"
            defaultValue="the same business day"
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Submitting…" : "Submit & pay"}
        </Button>
        {state.error && (
          <span className="text-sm text-destructive">{state.error}</span>
        )}
      </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const isControlled = value !== undefined;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        {...(isControlled
          ? { value, onChange: (e) => onChange?.(e.target.value) }
          : { defaultValue })}
        placeholder={placeholder}
        className="rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

function Json({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <textarea
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
