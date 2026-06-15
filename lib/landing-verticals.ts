/**
 * Per-vertical landing page content. Each entry powers /for/[slug] —
 * the page template (components/landing/vertical-landing-page.tsx)
 * reads from here and renders the same shared layout with a custom
 * hero, transcript, and FAQ.
 *
 * Adding a vertical: append an entry and the dynamic route picks it
 * up via generateStaticParams. Slugs are stable (used in URLs); the
 * `industry` field links the page to the matching enum value so the
 * Solo CTA can deep-link into onboarding with the industry pre-selected.
 */

import type { Industry } from "./industry";

type TranscriptLine = { who: string; text: string };

export type Vertical = {
  slug: string;
  industry: Industry;
  /** Plural noun for use in copy: "HVAC contractors", "salons". */
  audience: string;
  /** Singular for "your X business" / similar slots. */
  audienceSingular: string;
  metaTitle: string;
  metaDescription: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroHeadlineAccent: string;
  heroSubhead: string;
  /** Hero call card story. Exactly three lines: caller, AI, caller-confirm. */
  callerName: string;
  callerPhone: string;
  callTranscript: [TranscriptLine, TranscriptLine, TranscriptLine];
  bookingLabel: string;
  smsToCaller: string;
  faqs: { q: string; a: string }[];
};

export const VERTICALS: readonly Vertical[] = [
  {
    slug: "hvac",
    industry: "hvac",
    audience: "HVAC contractors",
    audienceSingular: "HVAC business",
    metaTitle: "Copper · AI receptionist for HVAC contractors",
    metaDescription:
      "Answers every call, books service and installs straight into your calendar, and pages you the moment a no-heat or no-AC call comes in.",
    heroEyebrow: "For HVAC contractors",
    heroHeadline: "Your AI front desk for",
    heroHeadlineAccent: "HVAC.",
    heroSubhead:
      "Copper books service calls, qualifies no-heat and no-AC emergencies, and never leaves a tune-up lead on hold. Live in under an hour.",
    callerName: "Sarah Mitchell",
    callerPhone: "(415) 555-0142",
    callTranscript: [
      { who: "Sarah", text: "My AC just died and it's 95 out. Can someone come today?" },
      { who: "Copper AI", text: "Sounds urgent — I can get a tech to you at 1pm or 4pm today. Which works?" },
      { who: "Sarah", text: "1pm please." },
    ],
    bookingLabel: "AC repair · Today, 1:00 PM",
    smsToCaller:
      "Confirmed — AC repair today at 1:00 PM. Tech will text 15 min before arrival.",
    faqs: [
      {
        q: "Will the AI know how to triage a no-heat or no-AC call?",
        a: "Yes. You set what counts as an emergency for your shop (no heat in winter, no AC in extreme heat, gas smell, CO alarm). When the AI hears those, it collects the address and pages your cell immediately while keeping the caller on the line.",
      },
      {
        q: "Can it book service calls and installs in the same calendar?",
        a: "Yes. The AI checks your real Google Calendar availability, books service calls against your dispatch slots, and quotes installs from your pricing — then texts the customer a confirmation.",
      },
      {
        q: "Does it handle financing and warranty questions?",
        a: "It answers from the FAQs you write — financing partners, manufacturer warranties, what's covered under your labor warranty. It never invents an answer it doesn't have.",
      },
      {
        q: "What about maintenance plan callers?",
        a: "Members can be flagged with a tag, and you can put your plan details in the AI's playbook so it knows what's included. It can book the seasonal tune-up against the plan.",
      },
      {
        q: "Will it slot into ServiceTitan, Housecall Pro, or FieldEdge?",
        a: "Custom-tier integrations are scoped one-on-one. For Solo and Business tiers, the AI books into Google Calendar and texts you the details — most owners forward bookings into their dispatch tool manually or via Zapier.",
      },
    ],
  },
  {
    slug: "plumbing",
    industry: "plumbing",
    audience: "plumbers",
    audienceSingular: "plumbing business",
    metaTitle: "Copper · AI receptionist for plumbers",
    metaDescription:
      "Answers every call, books drain, leak, and water-heater jobs straight into your calendar, and pages you the moment an active leak or sewage backup comes in.",
    heroEyebrow: "For plumbers",
    heroHeadline: "Your AI front desk for",
    heroHeadlineAccent: "plumbing.",
    heroSubhead:
      "Copper books service calls, qualifies leaks and backups as emergencies, and never leaves a drain-cleaning lead on hold. Live in under an hour.",
    callerName: "Sarah Mitchell",
    callerPhone: "(415) 555-0142",
    callTranscript: [
      { who: "Sarah", text: "Hi, my kitchen sink is backed up. Can someone come out today?" },
      { who: "Copper AI", text: "Sounds like a clog. I can get you in at 2pm or 4pm today — what works?" },
      { who: "Sarah", text: "2pm works." },
    ],
    bookingLabel: "Drain cleaning · Today, 2:00 PM",
    smsToCaller:
      "Confirmed — drain cleaning today at 2:00 PM. We'll text 15 min before arrival.",
    faqs: [
      {
        q: "Will the AI know an active leak is an emergency?",
        a: "Yes. You define what counts (active leak, burst pipe, sewage backup, no hot water in winter). When the AI hears those, it grabs the address and pages your cell instantly, while keeping the caller calm and on the line.",
      },
      {
        q: "Can it book against my real dispatch calendar?",
        a: "Yes. It checks Google Calendar availability, books real slots, and confirms with the customer over SMS before they hang up.",
      },
      {
        q: "What happens after hours?",
        a: "You set the after-hours policy. Most plumbers route emergencies (active leaks, sewage backups) to their cell instantly and let non-urgent calls leave a message that gets a callback the next business day.",
      },
      {
        q: "Will it quote prices?",
        a: "Only what you list. The AI quotes from your services and pricing in the dashboard — if a caller asks about something not listed, it offers a callback rather than guessing.",
      },
      {
        q: "Will the same number stay on my truck?",
        a: "Yes. Most owners keep their existing number printed on the truck and forward calls to the Copper number. Customers see the number they know; Copper picks up.",
      },
    ],
  },
  {
    slug: "electrical",
    industry: "electrical",
    audience: "electricians",
    audienceSingular: "electrical contracting business",
    metaTitle: "Copper · AI receptionist for electricians",
    metaDescription:
      "Answers every call, books service and install jobs, and pages you the moment a sparking, smoke, or no-power emergency comes in.",
    heroEyebrow: "For electricians",
    heroHeadline: "Your AI front desk for",
    heroHeadlineAccent: "electrical.",
    heroSubhead:
      "Copper books service work, qualifies sparking and no-power emergencies, and quotes panel upgrades from your pricing — without making the caller hold.",
    callerName: "James Rivera",
    callerPhone: "(415) 555-0188",
    callTranscript: [
      { who: "James", text: "Outlets in half my house just stopped working. Is this serious?" },
      { who: "Copper AI", text: "Could be a tripped panel or a deeper issue — I can get an electrician to you by 4pm today." },
      { who: "James", text: "Yes please." },
    ],
    bookingLabel: "Electrical diagnostic · Today, 4:00 PM",
    smsToCaller:
      "Confirmed — electrical diagnostic today at 4:00 PM. We'll text 15 min before arrival.",
    faqs: [
      {
        q: "Will it know when an electrical call is an emergency?",
        a: "Yes. You define the criteria (sparking, smoke, burning smell, no power to the whole house). The AI grabs the address and pages your cell immediately when it hears them.",
      },
      {
        q: "Can it quote panel upgrades, EV chargers, or generators?",
        a: "It quotes ranges from what you list. For jobs requiring an on-site assessment (panels, rewires, generators), the AI explains that and books a quote visit instead of guessing a number.",
      },
      {
        q: "Does it handle permit questions?",
        a: "It answers from your FAQs — most electricians include 'we pull all required permits' as part of the standard pitch and the AI repeats it accurately.",
      },
      {
        q: "What about commercial calls?",
        a: "If you take commercial work, the AI qualifies and routes them according to your playbook — usually flagging commercial leads for a callback so you can scope properly.",
      },
      {
        q: "Will it sound like a robot?",
        a: "No. You pick one of six natural voices during setup. Most callers don't realize they're talking to AI until you tell them.",
      },
    ],
  },
  {
    slug: "roofing",
    industry: "roofing",
    audience: "roofers",
    audienceSingular: "roofing business",
    metaTitle: "Copper · AI receptionist for roofers",
    metaDescription:
      "Answers every call, books inspections and repairs straight into your calendar, and triages storm damage the moment the weather turns.",
    heroEyebrow: "For roofers",
    heroHeadline: "Your AI front desk for",
    heroHeadlineAccent: "roofing.",
    heroSubhead:
      "Copper books inspections, qualifies storm-damage and active-leak calls, and never lets a hailstorm lead go unanswered. Live in under an hour.",
    callerName: "Mark Davis",
    callerPhone: "(415) 555-0177",
    callTranscript: [
      { who: "Mark", text: "Storm last night ripped shingles off my roof. Can someone take a look?" },
      { who: "Copper AI", text: "Sorry to hear it. I can get an inspector out tomorrow at 10am — sound good?" },
      { who: "Mark", text: "That works, thanks." },
    ],
    bookingLabel: "Roof inspection · Tomorrow, 10:00 AM",
    smsToCaller:
      "Confirmed — roof inspection tomorrow at 10:00 AM. We'll text 15 min before arrival.",
    faqs: [
      {
        q: "Will the AI know when storm damage is urgent?",
        a: "Yes. You define what counts (active leak with rain in the forecast, exposed decking, tree on the roof). The AI escalates those to your phone immediately and books an inspection if you want.",
      },
      {
        q: "Can it handle insurance-claim questions?",
        a: "It answers from your FAQs — most roofers include their insurance-claim process (meeting the adjuster, documenting damage) and the AI repeats it accurately.",
      },
      {
        q: "Does it book full replacement quotes?",
        a: "For larger jobs (full roof replacement, big gutter runs), the AI books an on-site quote visit rather than guessing a number — exactly what you'd want.",
      },
      {
        q: "What about emergency tarp requests?",
        a: "Configure that as an emergency criterion. When the AI hears 'water coming through the ceiling,' it pages you instantly so you can dispatch a tarp before the next rain.",
      },
      {
        q: "Will my Google review traffic grow?",
        a: "Two hours after each completed job, Copper texts a friendly review request with a one-tap link to your Google profile. Most roofers see 3-5× more reviews per month.",
      },
    ],
  },
  {
    slug: "auto-repair",
    industry: "auto_repair",
    audience: "auto repair shops",
    audienceSingular: "auto repair shop",
    metaTitle: "Copper · AI receptionist for auto repair shops",
    metaDescription:
      "Answers every call, books diagnostics and service into your calendar, and handles warranty and loaner-car questions without making the customer hold.",
    heroEyebrow: "For auto repair shops",
    heroHeadline: "Your AI service writer for",
    heroHeadlineAccent: "auto repair.",
    heroSubhead:
      "Copper books diagnostics, quotes oil-change and brake-job ranges, and answers warranty and loaner questions — without pulling a tech off a lift to grab the phone.",
    callerName: "Lisa Park",
    callerPhone: "(415) 555-0163",
    callTranscript: [
      { who: "Lisa", text: "Check engine light is on and there's a rattle. Can you take a look?" },
      { who: "Copper AI", text: "I can run a diagnostic this afternoon at 2pm — want me to book it in?" },
      { who: "Lisa", text: "Yes please, I'll bring it in." },
    ],
    bookingLabel: "Diagnostic · Today, 2:00 PM",
    smsToCaller:
      "Confirmed — diagnostic today at 2:00 PM. Bring the car in and we'll text you when it's ready.",
    faqs: [
      {
        q: "Will the AI know which jobs need a diagnostic first?",
        a: "Yes. For check-engine lights, weird noises, or anything not-obvious, it books the diagnostic and lets the customer know the fee rolls into the repair if they proceed.",
      },
      {
        q: "Can it answer loaner-car questions?",
        a: "It answers from your FAQs — loaner policy, eligibility (jobs over four hours, subject to availability), and asks the customer to confirm at booking. No promises it can't keep.",
      },
      {
        q: "Will it quote oil changes and brake jobs?",
        a: "Quotes ranges from your pricing. For bigger jobs (transmission, engine work), it explains a quote requires diagnosis and books that instead.",
      },
      {
        q: "Does it text customers when the car is ready?",
        a: "The AI handles inbound texts. Outbound 'your car is ready' updates are typically sent by your team via the dashboard or your shop management software.",
      },
      {
        q: "How does it handle roadside emergencies?",
        a: "You set the policy. Most shops route roadside callers to AAA or their insurance — the AI explains the policy clearly and offers to book the tow-in.",
      },
    ],
  },
  {
    slug: "salons",
    industry: "salon_spa",
    audience: "salons and spas",
    audienceSingular: "salon",
    metaTitle: "Copper · AI receptionist for salons and spas",
    metaDescription:
      "Answers every call, books cuts, color, and massage into your calendar, enforces your cancellation policy, and protects walk-in time.",
    heroEyebrow: "For salons and spas",
    heroHeadline: "Your AI front desk for",
    heroHeadlineAccent: "salons.",
    heroSubhead:
      "Copper books cuts, color, and treatments by stylist, enforces your cancellation policy, and answers walk-in questions — so your front desk can focus on the guest in the chair.",
    callerName: "Maria Lopez",
    callerPhone: "(415) 555-0119",
    callTranscript: [
      { who: "Maria", text: "Can I get a cut and color with Lisa this Saturday?" },
      { who: "Copper AI", text: "I have 11am or 2pm Saturday with Lisa — which works?" },
      { who: "Maria", text: "11am, please." },
    ],
    bookingLabel: "Cut + color with Lisa · Sat, 11:00 AM",
    smsToCaller:
      "Confirmed — cut and color with Lisa Saturday at 11:00 AM. Reply C to cancel.",
    faqs: [
      {
        q: "Can it book by specific stylist?",
        a: "Yes. The AI sees each stylist's calendar and books with the stylist the guest asks for. New guests get matched to whoever has openings.",
      },
      {
        q: "Will it enforce my cancellation policy?",
        a: "It explains the policy clearly during booking and at confirmation. Enforcement (charging the fee) still happens in your salon software — Copper makes sure no one is surprised.",
      },
      {
        q: "How does it handle walk-ins?",
        a: "Configure your walk-in policy in the AI's playbook. The AI explains availability honestly: 'we welcome walk-ins when stylists are open — booking ahead guarantees the slot.'",
      },
      {
        q: "Can it handle product questions or color consults?",
        a: "It answers from your FAQs (product lines you carry, consultation policy, etc.). For specific color advice, it books a free consult rather than guessing.",
      },
      {
        q: "Does it text confirmations and reminders?",
        a: "Yes. After a booking it sends an SMS confirmation. A reminder the day before is on the roadmap — for now most salons rely on the confirmation plus their salon software's built-in reminders.",
      },
    ],
  },
  {
    slug: "dental",
    industry: "dental_medical",
    audience: "dental practices",
    audienceSingular: "dental practice",
    metaTitle: "Copper · AI receptionist for dental and medical practices",
    metaDescription:
      "Answers every call, books cleanings and new-patient exams, triages dental emergencies, and handles insurance questions without putting patients on hold.",
    heroEyebrow: "For dental and medical practices",
    heroHeadline: "Your AI front desk for",
    heroHeadlineAccent: "dental.",
    heroSubhead:
      "Copper books cleanings and new-patient exams, triages emergencies (severe pain, trauma), and answers insurance questions — so your front desk can stay focused on the chair.",
    callerName: "Daniel Chen",
    callerPhone: "(415) 555-0145",
    callTranscript: [
      { who: "Daniel", text: "I think I cracked a tooth — I'm in real pain. Can I be seen today?" },
      { who: "Copper AI", text: "Sounds urgent. I have an emergency slot at 1pm today — does that work?" },
      { who: "Daniel", text: "Yes, I'll be there." },
    ],
    bookingLabel: "Emergency exam · Today, 1:00 PM",
    smsToCaller:
      "Confirmed — emergency exam today at 1:00 PM. See you soon.",
    faqs: [
      {
        q: "Will the AI know when a call is a dental emergency?",
        a: "Yes. You define what counts (severe pain, swelling, trauma, knocked-out tooth, bleeding). When the AI hears those, it triages to the next available emergency slot and pages your office immediately.",
      },
      {
        q: "Can it handle insurance questions?",
        a: "It answers from your FAQs ('we take most major PPO plans, send us your info and we'll verify benefits before your visit'). It doesn't pretend to know coverage specifics it can't verify.",
      },
      {
        q: "Is Copper HIPAA-aware?",
        a: "Call transcripts, summaries, and SMS are stored in our infrastructure and we don't sign BAAs at the self-serve tier. For HIPAA workloads (storing PHI beyond minimum-necessary intake), email us about the Custom tier.",
      },
      {
        q: "Can it book new-patient exams differently from cleanings?",
        a: "Yes. Set the duration and intake questions for each appointment type in your dashboard. The AI picks the right slot and collects what you ask for at booking.",
      },
      {
        q: "Will it follow our cancellation and no-show policy?",
        a: "It explains the policy clearly when booking and confirming. Charging fees happens in your practice management software — Copper makes sure patients heard the policy.",
      },
    ],
  },
  {
    slug: "legal",
    industry: "legal_professional",
    audience: "law firms",
    audienceSingular: "legal practice",
    metaTitle: "Copper · AI receptionist for law firms and professional services",
    metaDescription:
      "Answers every call, books initial consultations, triages urgent matters, and respects confidentiality without pulling an attorney off a brief.",
    heroEyebrow: "For law firms and professional services",
    heroHeadline: "Your AI front desk for",
    heroHeadlineAccent: "legal.",
    heroSubhead:
      "Copper books consultations, qualifies urgent matters, and handles fee-structure questions — so attorneys aren't pulled off a brief every time the phone rings.",
    callerName: "Rachel Kim",
    callerPhone: "(415) 555-0154",
    callTranscript: [
      { who: "Rachel", text: "I got a contract I need to review before signing. Can someone help?" },
      { who: "Copper AI", text: "We do contract reviews. I can book a free 20-minute intake call tomorrow at 10am — does that work?" },
      { who: "Rachel", text: "Perfect, see you then." },
    ],
    bookingLabel: "Initial consult · Tomorrow, 10:00 AM",
    smsToCaller:
      "Confirmed — initial consult tomorrow at 10:00 AM. We'll call you then.",
    faqs: [
      {
        q: "Will the AI know when a matter is urgent?",
        a: "Yes. You define urgent (court date within 48 hours, arrest, active injunction). When the AI hears those, it escalates to the on-call attorney instead of booking out a routine consult.",
      },
      {
        q: "How does it handle confidentiality?",
        a: "Call transcripts and SMS are stored in our infrastructure. We don't share data with model providers for training. For attorney-client privilege-sensitive workloads, the AI's intake is designed to capture matter type and contact info without prompting confidential detail.",
      },
      {
        q: "Can it explain fee structures?",
        a: "It answers from your FAQs — hourly vs. flat fee, free initial calls, retainer policy. For specific quotes, it books a consultation rather than guessing.",
      },
      {
        q: "What about conflict checks?",
        a: "The AI collects names and matter type at intake. Conflict checks happen in your firm management software before the consultation actually proceeds — Copper does not run conflict checks.",
      },
      {
        q: "Can it book intake calls with specific attorneys?",
        a: "Yes. If your firm routes by practice area or attorney, configure that in the playbook — the AI books with the right person based on what the caller describes.",
      },
    ],
  },
];

export function getVertical(slug: string): Vertical | undefined {
  return VERTICALS.find((v) => v.slug === slug);
}

export function verticalSlugs(): string[] {
  return VERTICALS.map((v) => v.slug);
}
