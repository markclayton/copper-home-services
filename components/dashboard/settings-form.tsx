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
import {
  ServicesEditor,
  type ServiceRow,
} from "@/components/onboarding/services-editor";
import { FaqsEditor, type FaqRow } from "@/components/onboarding/faqs-editor";
import { VoicePicker } from "@/components/onboarding/voice-picker";
import { DEFAULT_VOICE_ID } from "@/lib/voice/voices";
import {
  DEFAULT_NOTIFY_CHANNELS,
  type Business,
  type KnowledgeBase,
  type NotifyChannels,
  type NotifyEvent,
} from "@/lib/db/schema";

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
  const [services, setServices] = useState<ServiceRow[]>(asServices(kb?.services));
  const [faqs, setFaqs] = useState<FaqRow[]>(asFaqs(kb?.faqs));
  const [voiceId, setVoiceId] = useState<string>(
    business.voiceId ?? DEFAULT_VOICE_ID,
  );
  const [notifyChannels, setNotifyChannels] = useState<NotifyChannels>(
    business.notifyChannels ?? DEFAULT_NOTIFY_CHANNELS,
  );

  function setChannel(
    event: NotifyEvent,
    channel: "sms" | "email",
    value: boolean,
  ) {
    setNotifyChannels((prev) => ({
      ...prev,
      [event]: { ...prev[event], [channel]: value },
    }));
  }

  function updateDay(day: DayKey, patch: Partial<HoursDay>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-3xl">
      <input type="hidden" name="hours" value={JSON.stringify(hours)} />
      <input type="hidden" name="services" value={JSON.stringify(services)} />
      <input type="hidden" name="faqs" value={JSON.stringify(faqs)} />
      <input type="hidden" name="voiceId" value={voiceId} />
      <input
        type="hidden"
        name="notifyChannels"
        value={JSON.stringify(notifyChannels)}
      />

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
          <CardTitle>Services</CardTitle>
          <CardDescription>
            What you offer, with rough pricing. The AI quotes only what&apos;s
            here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServicesEditor value={services} onChange={setServices} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FAQs</CardTitle>
          <CardDescription>
            The questions callers ask most. The AI answers using these
            directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FaqsEditor value={faqs} onChange={setFaqs} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice & behavior</CardTitle>
          <CardDescription>
            Pick the voice your callers hear, plus any tone quirks.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Voice</Label>
            <VoicePicker value={voiceId} onChange={setVoiceId} />
          </div>
          <TextareaField
            label="Personality notes"
            name="brandVoiceNotes"
            defaultValue={kb?.brandVoiceNotes ?? ""}
            placeholder="No jargon, skip pleasantries, keep it brief."
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

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            How we ping you when something happens. SMS goes to{" "}
            {business.ownerPhone}; email goes to {business.ownerEmail}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-3 items-center text-sm">
            <div className="text-xs text-muted-foreground uppercase tracking-wide" />
            <div className="text-xs text-muted-foreground uppercase tracking-wide text-center w-12">
              SMS
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide text-center w-12">
              Email
            </div>

            <NotifyRow
              label="Booking confirmed"
              hint="When the AI books an appointment."
              channels={notifyChannels.appointment}
              onChange={(c, v) => setChannel("appointment", c, v)}
            />
            <NotifyRow
              label="Emergency call"
              hint="When the AI flags an urgent situation."
              channels={notifyChannels.emergency}
              onChange={(c, v) => setChannel("emergency", c, v)}
            />
            <NotifyRow
              label="Call summary"
              hint="A short recap after every completed call."
              channels={notifyChannels.callSummary}
              onChange={(c, v) => setChannel("callSummary", c, v)}
            />
          </div>
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

function NotifyRow({
  label,
  hint,
  channels,
  onChange,
}: {
  label: string;
  hint: string;
  channels: { sms: boolean; email: boolean };
  onChange: (channel: "sms" | "email", value: boolean) => void;
}) {
  return (
    <>
      <div className="contents">
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <div className="flex justify-center w-12">
          <Checkbox
            checked={channels.sms}
            onCheckedChange={(checked) => onChange("sms", !!checked)}
          />
        </div>
        <div className="flex justify-center w-12">
          <Checkbox
            checked={channels.email}
            onCheckedChange={(checked) => onChange("email", !!checked)}
          />
        </div>
      </div>
    </>
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
