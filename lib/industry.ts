/**
 * Industry registry — single source of truth for the supported small-business
 * verticals. The enum values are mirrored in the Postgres `industry` type
 * (lib/db/schema.ts) and the onboarding + settings forms render from this
 * list. The `descriptor` slots into the AI receptionist's prompt — see
 * `industryDescriptor` below for the exact phrasing.
 *
 * Adding an industry: append it here, then add the value to the pg-enum and
 * write a migration with ALTER TYPE "industry" ADD VALUE.
 */

export const INDUSTRY_VALUES = [
  "hvac",
  "plumbing",
  "electrical",
  "roofing",
  "pest_control",
  "landscaping",
  "cleaning",
  "garage_doors",
  "handyman",
  "other_home_services",
  "auto_repair",
  "salon_spa",
  "dental_medical",
  "legal_professional",
  "other",
] as const;

export type Industry = (typeof INDUSTRY_VALUES)[number];

export type IndustryCategory = "home_services" | "auto" | "personal_care" | "health" | "professional" | "other";

type IndustryDef = {
  value: Industry;
  label: string;
  category: IndustryCategory;
  /** Slots into "owner-operated ${descriptor}" in the receptionist prompt. */
  descriptor: string;
};

export const INDUSTRIES: readonly IndustryDef[] = [
  { value: "hvac", label: "HVAC", category: "home_services", descriptor: "HVAC business" },
  { value: "plumbing", label: "Plumbing", category: "home_services", descriptor: "plumbing business" },
  { value: "electrical", label: "Electrical", category: "home_services", descriptor: "electrical contracting business" },
  { value: "roofing", label: "Roofing", category: "home_services", descriptor: "roofing business" },
  { value: "pest_control", label: "Pest control", category: "home_services", descriptor: "pest control business" },
  { value: "landscaping", label: "Landscaping / lawn care", category: "home_services", descriptor: "landscaping business" },
  { value: "cleaning", label: "Cleaning services", category: "home_services", descriptor: "cleaning business" },
  { value: "garage_doors", label: "Garage doors", category: "home_services", descriptor: "garage door business" },
  { value: "handyman", label: "Handyman", category: "home_services", descriptor: "handyman business" },
  { value: "other_home_services", label: "Other home services", category: "home_services", descriptor: "home services business" },
  { value: "auto_repair", label: "Auto repair", category: "auto", descriptor: "auto repair shop" },
  { value: "salon_spa", label: "Salon / spa / barber", category: "personal_care", descriptor: "salon or spa" },
  { value: "dental_medical", label: "Dental / medical practice", category: "health", descriptor: "dental or medical practice" },
  { value: "legal_professional", label: "Legal / professional services", category: "professional", descriptor: "professional services firm" },
  { value: "other", label: "Other (tell us about your business)", category: "other", descriptor: "small business" },
] as const;

const BY_VALUE: Record<Industry, IndustryDef> = INDUSTRIES.reduce(
  (acc, def) => {
    acc[def.value] = def;
    return acc;
  },
  {} as Record<Industry, IndustryDef>,
);

export const CATEGORY_LABELS: Record<IndustryCategory, string> = {
  home_services: "Home services",
  auto: "Auto",
  personal_care: "Personal care",
  health: "Health",
  professional: "Professional services",
  other: "Other",
};

/** Ordered list of categories for grouped <optgroup> rendering. */
export const CATEGORY_ORDER: readonly IndustryCategory[] = [
  "home_services",
  "auto",
  "personal_care",
  "health",
  "professional",
  "other",
];

export function isIndustry(value: unknown): value is Industry {
  return typeof value === "string" && (INDUSTRY_VALUES as readonly string[]).includes(value);
}

export function industryLabel(value: Industry | null | undefined): string {
  if (!value) return "Not set";
  return BY_VALUE[value]?.label ?? "Other";
}

/**
 * Phrase used inside the AI receptionist's BUSINESS CONTEXT line:
 *   "Acme HVAC — owner-operated ${descriptor} based in timezone ..."
 *
 * Falls back to "small business" so drafts and any legacy NULL rows
 * still produce a coherent prompt.
 */
export function industryDescriptor(value: Industry | null | undefined): string {
  if (!value) return "small business";
  return BY_VALUE[value]?.descriptor ?? "small business";
}

/** Grouped view for <select><optgroup> rendering. */
export function industriesByCategory(): Array<{
  category: IndustryCategory;
  label: string;
  options: IndustryDef[];
}> {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    options: INDUSTRIES.filter((i) => i.category === category),
  }));
}
