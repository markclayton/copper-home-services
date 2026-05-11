"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveBusinessStep,
  type BusinessStepState,
} from "@/app/onboard/business/actions";
import type { Business } from "@/lib/db/schema";

const INITIAL: BusinessStepState = { ok: false };

const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export function BusinessStepForm({ business }: { business: Business }) {
  const [state, formAction, pending] = useActionState(
    saveBusinessStep,
    INITIAL,
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
        Welcome to Copper
      </div>
      <h1 className="text-2xl font-semibold mt-1">
        Let&apos;s set up your AI receptionist.
      </h1>
      <p className="text-sm text-muted-foreground mb-4">
        Takes about five minutes. We&apos;ll start with the basics, then your
        services, hours, and voice. You can come back and edit anything later.
      </p>

      <form action={formAction} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="name">Business name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={business.name ?? ""}
            placeholder="Acme HVAC"
            required
            autoFocus
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ownerName">Your name</Label>
          <Input
            id="ownerName"
            name="ownerName"
            defaultValue={business.ownerName ?? ""}
            placeholder="Jane Doe"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ownerPhone">Your cell phone</Label>
          <Input
            id="ownerPhone"
            name="ownerPhone"
            type="tel"
            defaultValue={business.ownerPhone ?? ""}
            placeholder="+1 555 123 4567"
            required
          />
          <p className="text-xs text-muted-foreground">
            Where we&apos;ll text you call summaries and emergency alerts.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="timezone">Time zone</Label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={business.timezone}
            className="rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
