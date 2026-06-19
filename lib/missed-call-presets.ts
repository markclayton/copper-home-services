/**
 * Per-industry defaults for the missed-call revenue calculator. Job
 * values are rough mid-market estimates (USD); the form lets visitors
 * adjust to their actual business.
 *
 * Slugs match the existing Industry enum so we can deep-link from
 * /for/{slug} into the calculator with the right preset selected.
 */

import type { Industry } from "./industry";

export type CalcPreset = {
  industry: Industry;
  /** Display label for the dropdown — verticals already in the landing nav. */
  label: string;
  /** Median single-job revenue, USD. */
  avgJobValueUsd: number;
  /** Default monthly missed-call estimate. SMBs that picked us had ~12-25. */
  missedCallsPerMonth: number;
};

export const CALC_PRESETS: readonly CalcPreset[] = [
  { industry: "hvac", label: "HVAC", avgJobValueUsd: 400, missedCallsPerMonth: 18 },
  { industry: "plumbing", label: "Plumbing", avgJobValueUsd: 350, missedCallsPerMonth: 20 },
  { industry: "electrical", label: "Electrical", avgJobValueUsd: 300, missedCallsPerMonth: 15 },
  { industry: "roofing", label: "Roofing", avgJobValueUsd: 800, missedCallsPerMonth: 12 },
  { industry: "pest_control", label: "Pest control", avgJobValueUsd: 180, missedCallsPerMonth: 15 },
  { industry: "landscaping", label: "Landscaping", avgJobValueUsd: 220, missedCallsPerMonth: 16 },
  { industry: "cleaning", label: "Cleaning", avgJobValueUsd: 150, missedCallsPerMonth: 14 },
  { industry: "garage_doors", label: "Garage doors", avgJobValueUsd: 400, missedCallsPerMonth: 12 },
  { industry: "handyman", label: "Handyman", avgJobValueUsd: 220, missedCallsPerMonth: 18 },
  { industry: "auto_repair", label: "Auto repair", avgJobValueUsd: 500, missedCallsPerMonth: 16 },
  { industry: "salon_spa", label: "Salon / spa", avgJobValueUsd: 90, missedCallsPerMonth: 20 },
  { industry: "dental_medical", label: "Dental / medical", avgJobValueUsd: 300, missedCallsPerMonth: 14 },
  { industry: "legal_professional", label: "Legal / professional", avgJobValueUsd: 500, missedCallsPerMonth: 10 },
  { industry: "other_home_services", label: "Other home services", avgJobValueUsd: 250, missedCallsPerMonth: 15 },
  { industry: "other", label: "Other", avgJobValueUsd: 200, missedCallsPerMonth: 12 },
];

export const DEFAULT_PRESET = CALC_PRESETS[0];

/**
 * Realistic mid-market assumptions for the conversion stages. The form
 * lets visitors adjust both, but most don't — these are the numbers
 * that drive the headline figure.
 */
export const DEFAULT_OPPORTUNITY_RATE = 0.65;
export const DEFAULT_BOOKING_RATE = 0.5;
