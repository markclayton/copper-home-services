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
  saveSettings,
  type SaveSettingsState,
} from "@/app/dashboard/settings/actions";
import type { Business, KnowledgeBase } from "@/lib/db/schema";

const INITIAL: SaveSettingsState = { ok: false };

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

function pretty(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function SettingsForm({
  business,
  kb,
}: {
  business: Business;
  kb: KnowledgeBase | null;
}) {
  const [state, formAction, pending] = useActionState(saveSettings, INITIAL);

  const initialHours = (business.hours as Hours | null) ?? DEFAULT_HOURS;
  const [hours, setHours] = useState<Hours>({ ...DEFAULT_HOURS, ...initialHours });

  function updateDay(day: DayKey, patch: Partial<HoursDay>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-3xl">
      <input type="hidden" name="hours" value={JSON.stringify(hours)} />

      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
          <CardDescription>
            Owner contact, time zone, and service area.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Business name" name="name" defaultValue={business.name} required />
          <FormField label="Time zone" name="timezone" defaultValue={business.timezone} required />
          <FormField label="Owner name" name="ownerName" defaultValue={business.ownerName} required />
          <FormField label="Owner email" name="ownerEmail" type="email" defaultValue={business.ownerEmail} required />
          <FormField label="Owner phone" name="ownerPhone" defaultValue={business.ownerPhone} required />
          <FormField
            label="Service area ZIPs (comma-separated)"
            name="serviceAreaZips"
            defaultValue={(business.serviceAreaZips ?? []).join(", ")}
          />
          <div className="md:col-span-2">
            <FormField
              label="Google review URL"
              name="googleReviewUrl"
              type="url"
              defaultValue={business.googleReviewUrl ?? ""}
              placeholder="https://g.page/r/..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hours</CardTitle>
          <CardDescription>
            24-hour times. Toggle &quot;Closed&quot; to mark a day off.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {DAYS.map(({ key, label }) => {
            const day = hours[key];
            return (
              <div key={key} className="grid grid-cols-[60px_1fr_1fr_120px] gap-3 items-center">
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
            JSON for V1. Owner-facing editors come later. Each section will be
            included in the AI assistant&apos;s prompt.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <JsonField
            label="Services"
            name="services"
            defaultValue={pretty(kb?.services)}
            placeholder='[{"name":"AC repair","priceRange":"$150 + parts"}]'
          />
          <JsonField
            label="FAQs"
            name="faqs"
            defaultValue={pretty(kb?.faqs)}
            placeholder='[{"q":"Are you licensed?","a":"Yes."}]'
          />
          <JsonField
            label="Pricing"
            name="pricing"
            defaultValue={pretty(kb?.pricing)}
            placeholder='{"diagnostic":150}'
          />
          <JsonField
            label="Policies"
            name="policies"
            defaultValue={pretty(kb?.policies)}
            placeholder='{"warranty":"1 year on labor"}'
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice & behavior</CardTitle>
          <CardDescription>
            Free-text fields the AI uses to set tone and handle edge cases.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <TextareaField
            label="Brand voice notes"
            name="brandVoiceNotes"
            defaultValue={kb?.brandVoiceNotes ?? ""}
            placeholder="Warm, professional, no jargon unless the caller uses it first."
            rows={2}
          />
          <TextareaField
            label="Emergency criteria"
            name="emergencyCriteria"
            defaultValue={kb?.emergencyCriteria ?? ""}
            placeholder="No heat in winter, gas smell, water leak, electrical sparking."
            rows={3}
          />
          <TextareaField
            label="Voicemail script"
            name="voicemailScript"
            defaultValue={kb?.voicemailScript ?? ""}
            rows={2}
          />
          <TextareaField
            label="After-hours policy"
            name="afterHoursPolicy"
            defaultValue={kb?.afterHoursPolicy ?? ""}
            rows={2}
          />
          <FormField
            label="Quote callback window"
            name="quoteCallbackWindow"
            defaultValue={kb?.quoteCallbackWindow ?? "the same business day"}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {state.ok && (
          <span className="text-sm text-muted-foreground">
            Saved. {state.deployStatus}
          </span>
        )}
        {!state.ok && state.error && (
          <span className="text-sm text-destructive">{state.error}</span>
        )}
      </div>
    </form>
  );
}

function FormField({
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

function TextareaField({
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

function JsonField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        rows={6}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
