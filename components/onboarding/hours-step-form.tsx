"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveHoursStep,
  type HoursStepState,
} from "@/app/onboard/hours/actions";
import type { Business } from "@/lib/db/schema";

const INITIAL: HoursStepState = { ok: false };

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

export function HoursStepForm({ business }: { business: Business }) {
  const initial = (business.hours as Hours | null) ?? DEFAULT_HOURS;
  const [hours, setHours] = useState<Hours>({ ...DEFAULT_HOURS, ...initial });
  const [state, formAction, pending] = useActionState(saveHoursStep, INITIAL);

  function update(day: DayKey, patch: Partial<HoursDay>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Hours</h1>
      <p className="text-sm text-muted-foreground mb-4">
        When are you open? The AI uses this to set expectations with callers
        — e.g. &ldquo;we&apos;re closed today, want to book first thing
        tomorrow?&rdquo;
      </p>

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="hours" value={JSON.stringify(hours)} />

        <div className="rounded-md border p-4">
          <Label className="text-sm font-medium mb-3 block">Hours</Label>
          <div className="flex flex-col gap-2">
            {DAYS.map(({ key, label }) => {
              const day = hours[key];
              return (
                <div
                  key={key}
                  className="grid grid-cols-[60px_1fr_1fr_110px] gap-3 items-center"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <Input
                    type="time"
                    value={day.open}
                    onChange={(e) => update(key, { open: e.target.value })}
                    disabled={day.closed}
                  />
                  <Input
                    type="time"
                    value={day.close}
                    onChange={(e) => update(key, { close: e.target.value })}
                    disabled={day.closed}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!day.closed}
                      onCheckedChange={(checked) =>
                        update(key, { closed: !!checked })
                      }
                    />
                    Closed
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <Label
            htmlFor="serviceAreaZips"
            className="flex items-center gap-2"
          >
            Service area ZIPs
            <span className="text-xs font-normal text-muted-foreground">
              optional
            </span>
          </Label>
          <Input
            id="serviceAreaZips"
            name="serviceAreaZips"
            defaultValue={(business.serviceAreaZips ?? []).join(", ")}
            placeholder="94102, 94103, 94110"
          />
          <p className="text-xs text-muted-foreground">
            Only fill this in if you want the AI to politely decline calls
            from outside your service area. Leave blank if you take work
            anywhere or don&apos;t want a hard boundary.
          </p>
        </div>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="flex justify-between pt-2">
          <Button asChild variant="ghost">
            <a href="/onboard/services">Back</a>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
