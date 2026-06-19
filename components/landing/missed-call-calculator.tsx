"use client";

/**
 * Missed-call revenue calculator. Inputs: industry preset (sets avg job
 * value), missed calls/month, opportunity rate (% of missed calls that
 * are real leads), booking rate (% of leads that book). Outputs: monthly
 * and yearly revenue lost. Includes a CTA into onboarding.
 *
 * Designed as a single client component so the result updates as the
 * user drags sliders — no debounce needed; the math is trivial.
 */

import { useMemo, useState } from "react";
import { CTAButton, SiteFooter, SiteHeader } from "./landing-page";
import {
  CALC_PRESETS,
  DEFAULT_BOOKING_RATE,
  DEFAULT_OPPORTUNITY_RATE,
  DEFAULT_PRESET,
} from "@/lib/missed-call-presets";

export function MissedCallCalculatorPage({ isAuthed }: { isAuthed: boolean }) {
  return (
    <div className="bg-cream-100 text-ink min-h-screen font-sans antialiased selection:bg-copper/20">
      <SiteHeader isAuthed={isAuthed} />
      <Hero />
      <Calculator isAuthed={isAuthed} />
      <Methodology />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-ink/10">
      <div className="mx-auto max-w-4xl px-6 pt-16 pb-10 md:pt-20 md:pb-12">
        <div className="text-xs uppercase tracking-[0.18em] text-copper-600 font-medium mb-4">
          ROI calculator
        </div>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
          What are missed calls{" "}
          <span className="text-copper-600 italic font-light">
            actually costing you?
          </span>
        </h1>
        <p className="mt-6 text-lg text-ink-700 max-w-2xl leading-relaxed">
          Plug in your trade, a rough estimate of how many calls you miss in a
          month, and your typical job size. We&apos;ll do the math.
        </p>
      </div>
    </section>
  );
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function Calculator({ isAuthed }: { isAuthed: boolean }) {
  const [industry, setIndustry] = useState(DEFAULT_PRESET.industry);
  const preset = useMemo(
    () => CALC_PRESETS.find((p) => p.industry === industry) ?? DEFAULT_PRESET,
    [industry],
  );
  const [missedCalls, setMissedCalls] = useState(preset.missedCallsPerMonth);
  const [avgJobValue, setAvgJobValue] = useState(preset.avgJobValueUsd);
  const [opportunityRate, setOpportunityRate] = useState(
    DEFAULT_OPPORTUNITY_RATE,
  );
  const [bookingRate, setBookingRate] = useState(DEFAULT_BOOKING_RATE);

  // Whenever the user picks a different industry, snap job value + missed
  // calls back to the preset defaults — they'll edit if their numbers
  // differ, but most accept the trade-typical defaults.
  const handleIndustryChange = (value: typeof DEFAULT_PRESET.industry) => {
    setIndustry(value);
    const p = CALC_PRESETS.find((x) => x.industry === value) ?? DEFAULT_PRESET;
    setMissedCalls(p.missedCallsPerMonth);
    setAvgJobValue(p.avgJobValueUsd);
  };

  const realOpportunities = missedCalls * opportunityRate;
  const bookedJobs = realOpportunities * bookingRate;
  const monthlyLost = bookedJobs * avgJobValue;
  const yearlyLost = monthlyLost * 12;

  // Build the onboarding link with the calculator state in the URL so the
  // person ends up in the right vertical's onboarding with context preserved.
  const startHref = isAuthed
    ? "/dashboard"
    : `/onboard/start?industry=${industry}&utm_source=missed-call-calculator`;

  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 py-12 md:py-16 grid md:grid-cols-[1.05fr_1fr] gap-8">
        <div className="rounded-2xl border border-ink/15 bg-cream-50 p-6 md:p-8 flex flex-col gap-6">
          <h2 className="font-display text-2xl">Your business</h2>

          <Field label="Trade">
            <select
              value={industry}
              onChange={(e) =>
                handleIndustryChange(
                  e.target.value as typeof DEFAULT_PRESET.industry,
                )
              }
              className="w-full rounded-md border border-ink/20 bg-cream-50 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-copper-400"
            >
              {CALC_PRESETS.map((p) => (
                <option key={p.industry} value={p.industry}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <NumberField
            label="Missed calls per month"
            min={0}
            max={200}
            step={1}
            value={missedCalls}
            onChange={setMissedCalls}
            suffix="calls / mo"
          />

          <NumberField
            label="Average job value"
            min={50}
            max={5000}
            step={25}
            value={avgJobValue}
            onChange={setAvgJobValue}
            prefix="$"
          />

          <PercentField
            label="What share of missed calls are real leads?"
            value={opportunityRate}
            onChange={setOpportunityRate}
            hint="Most owners we talk to say 60–75% — the rest are spam, wrong numbers, or already-booked customers."
          />

          <PercentField
            label="What share of real leads would book?"
            value={bookingRate}
            onChange={setBookingRate}
            hint="A reasonable booking rate for SMBs is 40–60% on inbound leads."
          />
        </div>

        <div className="rounded-2xl border border-copper-400 bg-copper-50/40 p-6 md:p-8 flex flex-col gap-5">
          <div className="text-xs uppercase tracking-[0.18em] text-copper-700 font-medium">
            What missed calls are costing you
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-sm text-ink-700">Per month</div>
            <div className="font-display text-4xl md:text-5xl text-copper-700">
              {formatUsd(monthlyLost)}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-sm text-ink-700">Per year</div>
            <div className="font-display text-3xl md:text-4xl text-ink-800">
              {formatUsd(yearlyLost)}
            </div>
          </div>

          <div className="border-t border-copper-300 pt-4 text-sm text-ink-700 leading-relaxed">
            That&apos;s{" "}
            <span className="font-semibold text-ink-900">
              {Math.round(bookedJobs)} jobs
            </span>{" "}
            a month walking past you because no one answered the phone.
            Copper Solo at $79/mo answers every one of them.
          </div>

          <div className="pt-2">
            <CTAButton
              href={startHref}
              label={isAuthed ? "Open your dashboard" : "Stop the bleeding — get Copper"}
              prominent
            />
            <p className="text-xs text-ink-500 mt-2">
              No setup fee · 7-day trial · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-800">{label}</span>
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {prefix && (
            <span className="text-sm text-ink-700 shrink-0">{prefix}</span>
          )}
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value || 0))}
            className="flex-1 rounded-md border border-ink/20 bg-cream-50 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-copper-400"
          />
          {suffix && (
            <span className="text-sm text-ink-500 shrink-0">{suffix}</span>
          )}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-copper-600"
        />
      </div>
    </Field>
  );
}

function PercentField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <Field label={label}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            onChange={(e) => onChange(Number(e.target.value) / 100)}
            className="flex-1 accent-copper-600"
          />
          <span className="text-sm font-medium text-ink-800 w-12 text-right">
            {pct}%
          </span>
        </div>
        <p className="text-xs text-ink-500 leading-relaxed">{hint}</p>
      </div>
    </Field>
  );
}

function Methodology() {
  return (
    <section className="border-t border-ink/10">
      <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <h2 className="font-display text-2xl md:text-3xl mb-6">
          How we calculated it
        </h2>
        <div className="text-ink-700 leading-relaxed space-y-4 text-sm">
          <p>
            Three multiplications, no magic. We start with how many calls
            you miss in a month. Of those, some share are real leads —
            others are spam, robocalls, or people who already booked elsewhere.
            Of the real leads, a realistic share would actually book if
            someone picked up.
          </p>
          <p className="font-mono text-xs text-ink-600 bg-cream-50 border border-ink/15 rounded-md p-3">
            missed × opportunity rate × booking rate × avg job value =
            monthly revenue lost
          </p>
          <p>
            Defaults reflect what owners in each trade tell us when we ask.
            Adjust the sliders to match what you actually see — the math
            updates as you go.
          </p>
          <p>
            One thing worth saying: Copper&apos;s job is to capture the call
            in real time, not call back later. A callback an hour later
            already lost most of the urgency that put the lead on the phone
            with you in the first place. The number above is what you
            recover by being there when the phone rings.
          </p>
        </div>
      </div>
    </section>
  );
}
