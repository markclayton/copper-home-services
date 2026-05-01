"use client";

import { useActionState, useState } from "react";
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
  submitOnboarding,
  type SubmitOnboardingState,
} from "@/app/onboard/actions";

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
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);

  function updateDay(day: DayKey, patch: Partial<HoursDay>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="hours" value={JSON.stringify(hours)} />

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
          <Json label="Services" name="services" defaultValue={SAMPLE_SERVICES} />
          <Json label="FAQs" name="faqs" defaultValue={SAMPLE_FAQS} />
          <Json label="Pricing" name="pricing" defaultValue="{}" />
          <Json label="Policies" name="policies" defaultValue="{}" />
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
          />
          <Textarea
            label="What counts as an emergency?"
            name="emergencyCriteria"
            placeholder="No heat in winter, gas smell, water leak..."
            rows={3}
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
          {pending ? "Submitting…" : "Submit"}
        </Button>
        {state.error && (
          <span className="text-sm text-destructive">{state.error}</span>
        )}
      </div>
    </form>
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
  rows = 4,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

function Json({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        rows={6}
        defaultValue={defaultValue}
        className="rounded-md border bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
