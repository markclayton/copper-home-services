/**
 * Starter content packs per industry. Applied once at onboarding when the
 * owner picks their industry on step 1 — fills the knowledge base with
 * realistic services, FAQs, emergency criteria, and call scripts so the
 * wizard isn't an empty form and the AI is useful on the first call.
 *
 * Every field is editable in later wizard steps and in Settings; the pack
 * is a starting point, not a constraint. Pre-fill is gated at the SQL
 * layer (only writes when the KB is empty) so existing tenants are never
 * clobbered.
 */

import type { Industry } from "./industry";

export type StarterService = {
  name: string;
  description?: string;
  priceRange?: string;
  typicalDuration?: string;
};

export type StarterFaq = { q: string; a: string };

export type StarterPack = {
  services: StarterService[];
  faqs: StarterFaq[];
  emergencyCriteria: string;
  voicemailScript: string;
  afterHoursPolicy: string;
  quoteCallbackWindow: string;
};

const HVAC: StarterPack = {
  services: [
    { name: "AC repair", priceRange: "$150–$500", typicalDuration: "1–2 hours" },
    { name: "AC installation", priceRange: "$3,500–$8,500", typicalDuration: "1 day" },
    { name: "Furnace repair", priceRange: "$150–$600", typicalDuration: "1–2 hours" },
    { name: "Furnace installation", priceRange: "$3,500–$7,500", typicalDuration: "1 day" },
    { name: "Seasonal tune-up", priceRange: "$89–$149", typicalDuration: "1 hour" },
    { name: "Duct cleaning", priceRange: "$300–$500", typicalDuration: "2–3 hours" },
  ],
  faqs: [
    { q: "How fast can you come out?", a: "Most service calls go out the same day if you call before noon. Emergencies (no heat in winter, no AC in extreme heat) go to the front of the line." },
    { q: "Do you charge a service-call fee?", a: "Yes — a flat fee to dispatch a tech. If we do the work that day, the fee rolls into the job." },
    { q: "What brands do you service?", a: "All major brands — Carrier, Trane, Lennox, Goodman, Rheem, and more." },
    { q: "Do you offer financing?", a: "Yes, financing is available on installations over $3,000. We'll walk you through the options on-site." },
    { q: "Do you offer maintenance plans?", a: "Yes — our annual plan includes two seasonal tune-ups and priority scheduling." },
  ],
  emergencyCriteria:
    "No heat in winter, no AC in extreme heat, gas smell, carbon monoxide alarm, water leaking from an indoor AC unit.",
  voicemailScript:
    "You've reached us. Please leave your name, address, and a quick description of the issue — we'll call you back as soon as we can.",
  afterHoursPolicy:
    "After-hours emergencies (no heat, no AC in extreme heat, gas smell, CO alarm) are dispatched the same evening. Non-urgent calls get a callback first thing the next business day.",
  quoteCallbackWindow: "the same business day",
};

const PLUMBING: StarterPack = {
  services: [
    { name: "Drain cleaning", priceRange: "$150–$400", typicalDuration: "1–2 hours" },
    { name: "Leak repair", priceRange: "$150–$600", typicalDuration: "1–3 hours" },
    { name: "Water heater repair", priceRange: "$150–$700", typicalDuration: "1–3 hours" },
    { name: "Water heater installation", priceRange: "$1,200–$3,500", typicalDuration: "4–6 hours" },
    { name: "Toilet repair or install", priceRange: "$150–$700", typicalDuration: "1–3 hours" },
    { name: "Sewer line inspection", priceRange: "$200–$400", typicalDuration: "1–2 hours" },
  ],
  faqs: [
    { q: "Do you offer same-day service?", a: "Most calls get a tech out same day. Active leaks and sewage backups go to the front of the line." },
    { q: "Do you charge a service-call fee?", a: "Yes — a flat fee to dispatch. If you book the repair, it rolls into the total." },
    { q: "Do you warranty your work?", a: "Labor is warrantied for one year. Parts carry the manufacturer warranty." },
    { q: "What payment methods do you accept?", a: "Cash, check, all major credit cards, and financing on larger jobs." },
  ],
  emergencyCriteria:
    "Active water leak, burst pipe, sewage backup, no hot water in winter, flooded basement.",
  voicemailScript:
    "You've reached us. Please leave your name, address, and a description of the issue — we'll call you back as soon as we can.",
  afterHoursPolicy:
    "After-hours emergencies (active leaks, burst pipes, sewage backups) are dispatched immediately. Non-urgent calls get a callback first thing the next business day.",
  quoteCallbackWindow: "the same business day",
};

const ELECTRICAL: StarterPack = {
  services: [
    { name: "Outlet or switch repair", priceRange: "$100–$300", typicalDuration: "1–2 hours" },
    { name: "Panel upgrade", priceRange: "$1,500–$4,000", typicalDuration: "1 day" },
    { name: "EV charger installation", priceRange: "$800–$2,500", typicalDuration: "4–6 hours" },
    { name: "Lighting installation", priceRange: "$150–$600", typicalDuration: "1–3 hours" },
    { name: "Generator installation", priceRange: "Quote on-site", typicalDuration: "1–2 days" },
    { name: "Whole-home rewire", priceRange: "Quote on-site", typicalDuration: "2–5 days" },
  ],
  faqs: [
    { q: "Are you licensed and insured?", a: "Yes — fully licensed and insured. We pull permits on jobs that require them." },
    { q: "Do you offer free estimates?", a: "Free phone estimates on most jobs. On-site quotes for panel upgrades, rewires, and generators." },
    { q: "How fast can you come out?", a: "Most service calls get a tech the same day or next. Sparking, smoke, or no-power emergencies go first." },
    { q: "Do you pull permits?", a: "Yes — we handle all required permits and code compliance as part of the quote." },
  ],
  emergencyCriteria:
    "Electrical sparking, burning smell, smoke, no power to the whole house, exposed live wires.",
  voicemailScript:
    "You've reached us. Please leave your name, address, and a description of the issue — we'll call you back as soon as we can.",
  afterHoursPolicy:
    "After-hours emergencies (sparking, smoke, burning smell, no power) are dispatched immediately. Non-urgent calls get a callback first thing the next business day.",
  quoteCallbackWindow: "the same business day",
};

const ROOFING: StarterPack = {
  services: [
    { name: "Roof inspection", priceRange: "Free–$200", typicalDuration: "1 hour" },
    { name: "Leak repair", priceRange: "$300–$1,500", typicalDuration: "2–6 hours" },
    { name: "Shingle repair", priceRange: "$200–$800", typicalDuration: "1–4 hours" },
    { name: "Full roof replacement", priceRange: "Quote on-site", typicalDuration: "1–3 days" },
    { name: "Gutter installation", priceRange: "$7–$15 per linear foot", typicalDuration: "1 day" },
    { name: "Storm-damage assessment", priceRange: "Free–$200", typicalDuration: "1–2 hours" },
  ],
  faqs: [
    { q: "Do you work with insurance?", a: "Yes. We document storm damage, meet your adjuster on-site, and walk the claim through with you." },
    { q: "Do you offer free estimates?", a: "Yes — free estimates on all work." },
    { q: "What's the warranty?", a: "Workmanship warranty on every install. Materials carry the manufacturer warranty (typically 25–50 years on shingles)." },
    { q: "How long does a roof take?", a: "Most asphalt-shingle replacements are 1–2 days, weather permitting." },
  ],
  emergencyCriteria:
    "Active leak with rain in the forecast, storm damage with exposed decking, tree fallen on the roof.",
  voicemailScript:
    "You've reached us. Please leave your name, address, and a description of the damage or issue — we'll call you back as soon as we can.",
  afterHoursPolicy:
    "After-hours storm and active-leak calls are returned first thing the next morning. We can usually arrange an emergency tarp same-day if you need an immediate cover.",
  quoteCallbackWindow: "the same business day",
};

const HOME_SERVICES_GENERIC: StarterPack = {
  services: [
    { name: "Service call", priceRange: "$89–$149", typicalDuration: "1 hour" },
    { name: "Standard repair", priceRange: "Quote on-site", typicalDuration: "1–3 hours" },
    { name: "Installation", priceRange: "Quote on-site", typicalDuration: "1 day" },
    { name: "Maintenance", priceRange: "Quote on-site", typicalDuration: "1–2 hours" },
  ],
  faqs: [
    { q: "How fast can you come out?", a: "Most calls get a same-day or next-day slot. We'll book it during the call." },
    { q: "Do you charge a service-call fee?", a: "Yes — a flat fee to dispatch. If we do the work, it rolls into the job." },
    { q: "Are you licensed and insured?", a: "Yes — fully licensed and insured." },
    { q: "Do you offer free estimates?", a: "Free phone estimates on most jobs. On-site quotes for larger work." },
  ],
  emergencyCriteria:
    "Anything urgent or causing active property damage — describe the issue and we'll triage.",
  voicemailScript:
    "You've reached us. Please leave your name, address, and the reason for your call — we'll get back to you as soon as we can.",
  afterHoursPolicy:
    "We respond to emergencies after hours. Non-urgent calls get a callback first thing the next business day.",
  quoteCallbackWindow: "the same business day",
};

const AUTO_REPAIR: StarterPack = {
  services: [
    { name: "Oil change", priceRange: "$40–$90", typicalDuration: "30 minutes" },
    { name: "Brake service", priceRange: "$200–$700", typicalDuration: "2–4 hours" },
    { name: "Tire rotation and balance", priceRange: "$30–$80", typicalDuration: "30–45 minutes" },
    { name: "Diagnostic scan", priceRange: "$80–$150", typicalDuration: "30–60 minutes" },
    { name: "Battery replacement", priceRange: "$150–$300", typicalDuration: "30 minutes" },
    { name: "Check-engine repair", priceRange: "Quote after diagnostic", typicalDuration: "Varies" },
  ],
  faqs: [
    { q: "How long will it take?", a: "Most repairs are same-day. Larger jobs (transmission, engine work) we'll quote a turnaround once we diagnose." },
    { q: "Do you offer loaner cars?", a: "Yes, on jobs over four hours — subject to availability. Please ask when you book." },
    { q: "What's your warranty?", a: "12 months or 12,000 miles on parts and labor, whichever comes first." },
    { q: "Do you do free estimates?", a: "Yes — free estimates on all work after a diagnostic. The diagnostic fee rolls into the repair if you proceed." },
  ],
  emergencyCriteria:
    "Vehicle won't start, brake failure, smoke from engine bay, stuck on the side of the road, accident damage.",
  voicemailScript:
    "You've reached us. Please leave your name, the make and model of your vehicle, and what's going on — we'll call you back as soon as we can.",
  afterHoursPolicy:
    "After-hours messages get a callback first thing the next business day. For roadside emergencies, we recommend AAA or your insurance's roadside service.",
  quoteCallbackWindow: "the same business day",
};

const SALON_SPA: StarterPack = {
  services: [
    { name: "Women's haircut", priceRange: "$45–$90", typicalDuration: "45–60 minutes" },
    { name: "Men's haircut", priceRange: "$30–$50", typicalDuration: "30 minutes" },
    { name: "Color", priceRange: "$90–$200", typicalDuration: "2–3 hours" },
    { name: "Highlights or balayage", priceRange: "$120–$280", typicalDuration: "2–3 hours" },
    { name: "Blowout and style", priceRange: "$40–$70", typicalDuration: "45 minutes" },
    { name: "60-minute massage", priceRange: "$90–$140", typicalDuration: "60 minutes" },
  ],
  faqs: [
    { q: "Do you take walk-ins?", a: "Walk-ins are welcome when stylists are available. Booking ahead guarantees your slot and stylist." },
    { q: "What's your cancellation policy?", a: "We ask for at least 24 hours' notice. Cancellations under 24 hours are charged 50% of the service." },
    { q: "Do you offer consultations?", a: "Yes — free 15-minute consultations before color services or major cut changes." },
    { q: "Are you taking new clients?", a: "Yes, depending on the stylist. We'll match you with someone who has openings." },
  ],
  emergencyCriteria:
    "Allergic reaction to a product, chemical burn, severe scalp irritation.",
  voicemailScript:
    "You've reached us. Please leave your name, the service you're interested in, and a callback number — we'll be in touch as soon as we're free.",
  afterHoursPolicy:
    "After-hours messages get a callback first thing the next morning we're open.",
  quoteCallbackWindow: "the same business day",
};

const DENTAL_MEDICAL: StarterPack = {
  services: [
    { name: "New patient exam", priceRange: "$150–$300", typicalDuration: "60 minutes" },
    { name: "Cleaning", priceRange: "$90–$200", typicalDuration: "45–60 minutes" },
    { name: "Filling", priceRange: "$150–$400", typicalDuration: "30–60 minutes" },
    { name: "Crown", priceRange: "$900–$1,800", typicalDuration: "90 minutes" },
    { name: "X-rays", priceRange: "$25–$250", typicalDuration: "15–30 minutes" },
    { name: "Whitening", priceRange: "$300–$800", typicalDuration: "60 minutes" },
  ],
  faqs: [
    { q: "Do you take my insurance?", a: "We accept most major PPO plans. Share your insurance info and we'll verify benefits before your visit." },
    { q: "Do you offer payment plans?", a: "Yes — in-house payment plans, and we partner with CareCredit for larger treatment." },
    { q: "How soon can I be seen?", a: "New-patient exams usually book within two weeks. Urgent care (severe pain, swelling, trauma) is seen same day." },
    { q: "Do you see emergencies?", a: "Yes — we keep emergency slots open every day for severe pain, swelling, or trauma." },
  ],
  emergencyCriteria:
    "Severe tooth pain, facial swelling, dental trauma (knocked-out tooth, broken tooth), uncontrolled bleeding.",
  voicemailScript:
    "You've reached our office. Please leave your name, callback number, and the reason for your call. If this is a dental emergency, please say 'emergency' so we call you back first.",
  afterHoursPolicy:
    "After-hours messages are returned at 8 AM the next business day. For after-hours dental emergencies, our answering service can reach the on-call provider.",
  quoteCallbackWindow: "within one business day",
};

const LEGAL_PROFESSIONAL: StarterPack = {
  services: [
    { name: "Initial consultation", priceRange: "Free–$300", typicalDuration: "30–60 minutes" },
    { name: "Will and estate planning", priceRange: "$500–$2,500", typicalDuration: "Varies" },
    { name: "Contract review", priceRange: "$250–$1,500", typicalDuration: "Varies" },
    { name: "Business formation", priceRange: "$500–$2,500", typicalDuration: "Varies" },
    { name: "Real estate closing", priceRange: "$500–$2,000", typicalDuration: "Varies" },
    { name: "Litigation", priceRange: "Retainer-based", typicalDuration: "Varies" },
  ],
  faqs: [
    { q: "How much do you charge?", a: "We bill hourly for most matters. Flat fees are available for wills, business formation, and contract review — we'll quote at consultation." },
    { q: "Do you offer free consultations?", a: "Yes — a 20-minute free initial call to see if we're a fit. Formal consultations are billed after that." },
    { q: "What's the timeline?", a: "Depends on the matter. Most contract reviews are 3–5 business days; litigation can be months to years." },
    { q: "How quickly will I hear back?", a: "We respond to all client calls within one business day." },
  ],
  emergencyCriteria:
    "Court date within 48 hours with no representation, arrest, urgent injunction needed, active legal threat with a deadline.",
  voicemailScript:
    "You've reached our office. Please leave your name, callback number, and a brief description of the matter. If it's urgent, please say so — we'll call you back first.",
  afterHoursPolicy:
    "After-hours messages are returned the next business day. For urgent matters (court within 48 hours, arrest), our after-hours line will reach the on-call attorney.",
  quoteCallbackWindow: "within one business day",
};

const OTHER: StarterPack = {
  services: [],
  faqs: [],
  emergencyCriteria:
    "Anything urgent or causing harm — describe the issue and we'll triage.",
  voicemailScript:
    "You've reached us. Please leave your name, callback number, and the reason for your call — we'll be in touch as soon as we can.",
  afterHoursPolicy:
    "After-hours messages are returned the next business day. Urgent matters get prioritized.",
  quoteCallbackWindow: "within one business day",
};

const PACKS: Record<Industry, StarterPack> = {
  hvac: HVAC,
  plumbing: PLUMBING,
  electrical: ELECTRICAL,
  roofing: ROOFING,
  pest_control: HOME_SERVICES_GENERIC,
  landscaping: HOME_SERVICES_GENERIC,
  cleaning: HOME_SERVICES_GENERIC,
  garage_doors: HOME_SERVICES_GENERIC,
  handyman: HOME_SERVICES_GENERIC,
  other_home_services: HOME_SERVICES_GENERIC,
  auto_repair: AUTO_REPAIR,
  salon_spa: SALON_SPA,
  dental_medical: DENTAL_MEDICAL,
  legal_professional: LEGAL_PROFESSIONAL,
  other: OTHER,
};

export function getStarterPack(industry: Industry): StarterPack {
  return PACKS[industry];
}
