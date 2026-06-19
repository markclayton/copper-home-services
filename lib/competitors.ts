/**
 * Competitor comparison registry. Each entry powers a /vs/[slug] page —
 * fair, sourced comparisons that lead with what the competitor does well
 * before naming our differentiators. Smear pieces don't convert.
 *
 * Update rules:
 *   - Cite specifics (price, integrations, deployment model) only if
 *     publicly visible on the competitor's site or docs.
 *   - When their feature is unclear, say "Not advertised" rather than
 *     guessing. Wrong information here erodes trust faster than missing
 *     information.
 */

export type CompareRow = {
  /** What's being compared. Keep short — these are table row headers. */
  feature: string;
  /** Our side, ~80 chars or fewer for the cell. */
  copper: string;
  /** Their side, same length budget. */
  competitor: string;
  /** Optional explainer surfaced under the cell on detail pages. */
  note?: string;
};

export type Competitor = {
  slug: string;
  name: string;
  /** Their own tagline / how they describe themselves publicly. */
  tagline: string;
  /** Link back to their site — fairness signal, helps SEO. */
  homepage: string;
  /** One-sentence summary of who they're for. */
  summary: string;
  /** 2-3 things they're genuinely good at. Avoid hollow flattery. */
  strengths: string[];
  /** 2-3 things we do meaningfully differently, written in active voice. */
  copperDifferentiators: string[];
  /** When the buyer should pick them over us — being honest here is a
   *  signal of confidence and helps qualify in/out. */
  whenToPickThem: string;
  /** When Copper is the better fit. */
  whenToPickCopper: string;
  /** Side-by-side rows. Keep to 8-12 for scannability. */
  rows: CompareRow[];
  /** Comparison-page FAQs. */
  faqs: { q: string; a: string }[];
  /** SEO. */
  metaTitle: string;
  metaDescription: string;
};

const COPPER_TAGLINE = "From $79/mo. Self-serve onboarding in under an hour.";

export const COMPETITORS: readonly Competitor[] = [
  {
    slug: "myaifrontdesk",
    name: "MyAIFrontDesk",
    tagline: "AI receptionist with custom prompting and 24/7 answering.",
    homepage: "https://myaifrontdesk.com",
    summary:
      "MyAIFrontDesk is one of the longer-running AI receptionist products, aimed at small businesses that want a customizable phone agent without a built-in dispatch workflow.",
    strengths: [
      "Mature product with lots of prompt-customization knobs",
      "Wide voice + language selection",
      "Established brand with public case studies",
    ],
    copperDifferentiators: [
      "Industry-aware onboarding with starter packs for 13 verticals — you're live in under an hour, not a weekend",
      "Built-in Google Calendar booking with SMS consent capture for A2P 10DLC compliance",
      "Per-call cost tracking and live transcript view operators can read while a call is happening",
    ],
    whenToPickThem:
      "You want maximum prompt control and have time to hand-tune the assistant before going live.",
    whenToPickCopper:
      "You want booking, KB ingestion, and an AI receptionist that's helpful out of the box without a long configuration phase.",
    rows: [
      { feature: "Setup time", copper: "Under an hour, self-serve", competitor: "Hours to days, with manual tuning" },
      { feature: "Pricing (entry)", copper: "$79/mo Solo", competitor: "From $97/mo (public list)" },
      { feature: "Google Calendar booking", copper: "Native, included", competitor: "Via integrations / Zapier" },
      { feature: "SMS confirmation + A2P consent", copper: "Built in, captured by the AI on the call", competitor: "Not advertised as a first-class flow" },
      { feature: "Document upload to KB", copper: "PDF + DOCX + website crawl", competitor: "Prompt-based knowledge" },
      { feature: "Live transcript during the call", copper: "Yes — pulses in the dashboard", competitor: "Post-call transcripts" },
      { feature: "Industry-specific starter packs", copper: "13 verticals pre-filled", competitor: "Blank slate" },
      { feature: "Self-hosted option", copper: "No, hosted only", competitor: "No, hosted only" },
    ],
    faqs: [
      {
        q: "Can I import my MyAIFrontDesk prompt into Copper?",
        a: "Yes — paste it into the brand voice and FAQ fields during onboarding. We'll layer your KB documents and the industry starter pack on top so the AI has more than the prompt to work from.",
      },
      {
        q: "How does pricing compare?",
        a: "Copper Solo is $79/mo and includes 500 voice minutes. Business is $249/mo with 2,000 minutes. MyAIFrontDesk's published tiers start at $97/mo as of this writing.",
      },
      {
        q: "What if I outgrow Copper Business?",
        a: "Custom tier ($599+) covers higher minute caps, ServiceTitan / Housecall Pro integrations, and dedicated support. Email contact-sales@joincopper.io.",
      },
    ],
    metaTitle: "Copper vs MyAIFrontDesk: AI receptionist comparison",
    metaDescription:
      "Side-by-side comparison of Copper and MyAIFrontDesk. Pricing, setup time, booking, KB ingestion, and live transcript — honest tradeoffs in one page.",
  },
  {
    slug: "goodcall",
    name: "Goodcall",
    tagline: "AI phone agent for small businesses.",
    homepage: "https://goodcall.com",
    summary:
      "Goodcall is a phone-first AI receptionist marketed broadly to SMBs — restaurants, retail, services. Strong on quick setup and basic call handling.",
    strengths: [
      "Fast initial setup with a tunable phone agent",
      "Free tier for trying it out",
      "Clean caller experience",
    ],
    copperDifferentiators: [
      "Booking goes straight into Google Calendar, not just a captured intent for the owner to follow up on",
      "Per-vertical starter packs for home services, salons, dental, legal — the AI sounds like it knows your trade on day one",
      "Owner messages, live transcript, and unified inbox so you can triage everything from one screen",
    ],
    whenToPickThem:
      "You want the cheapest entry point, your call volume is light, and you'll handle booking yourself.",
    whenToPickCopper:
      "You want the AI to book the appointment, not just take a message — and you want the same product to grow with you from Solo to Business.",
    rows: [
      { feature: "Pricing (entry)", copper: "$79/mo Solo (no free tier)", competitor: "Free tier + $19/mo paid" },
      { feature: "Free tier", copper: "No — 7-day card-on-file trial", competitor: "Yes, limited" },
      { feature: "Calendar booking", copper: "Books into Google Calendar live on the call", competitor: "Mostly takes-a-message" },
      { feature: "SMS confirmation + A2P consent", copper: "Built in", competitor: "Limited" },
      { feature: "Document upload to KB", copper: "PDF + DOCX + website crawl", competitor: "Manual FAQs" },
      { feature: "Per-call cost transparency", copper: "Yes — built-in unit economics tracking", competitor: "Not advertised" },
      { feature: "Industry-specific starter packs", copper: "13 verticals", competitor: "Generic" },
    ],
    faqs: [
      {
        q: "Is Goodcall's free tier enough for a small home services business?",
        a: "It can be — for the first few months while you're seeing if AI receptionist works at all. But if you want the AI to actually book appointments (not just take messages), Copper Solo at $79/mo is the practical comparable.",
      },
      {
        q: "Will the AI handle pricing questions in a quote-heavy trade like plumbing?",
        a: "Both products answer pricing questions from a list you provide. Copper additionally lets you upload service catalogs as PDF — the AI searches them mid-call for quotes you don't want to retype as FAQs.",
      },
    ],
    metaTitle: "Copper vs Goodcall: AI receptionist comparison for SMBs",
    metaDescription:
      "Goodcall vs Copper: pricing, calendar booking, knowledge base, and which product actually books the appointment versus just takes a message.",
  },
  {
    slug: "phonely",
    name: "Phonely",
    tagline: "AI phone receptionist for SMBs.",
    homepage: "https://phonely.ai",
    summary:
      "Phonely targets small business owners who lose revenue from missed calls. Focused on getting an answering AI live quickly.",
    strengths: [
      "Clean UX for setup and call review",
      "Good voice quality out of the box",
      "Active product development",
    ],
    copperDifferentiators: [
      "RAG-backed mid-call knowledge search across uploaded docs and your website — not just structured FAQs",
      "Industry-aware onboarding for home services, salons, dental, legal — pre-filled services, FAQs, emergency criteria",
      "Per-tenant cost transparency so an owner can see exactly what an AI call cost in real provider charges",
    ],
    whenToPickThem:
      "You want the simplest possible setup and don't need calendar booking, KB ingestion, or vertical-specific behavior.",
    whenToPickCopper:
      "You're in a trade where 'sounds like they get my industry' matters — and you want the AI to handle booking, not just answering.",
    rows: [
      { feature: "Calendar booking", copper: "Google Calendar, live on the call", competitor: "Limited" },
      { feature: "Document upload to KB", copper: "PDF + DOCX + website crawl + mid-call RAG", competitor: "Manual FAQs" },
      { feature: "Industry-specific starter packs", copper: "13 verticals", competitor: "Generic" },
      { feature: "SMS confirmation + A2P consent", copper: "Built in", competitor: "Limited" },
      { feature: "Live transcript during call", copper: "Yes", competitor: "Post-call only" },
      { feature: "Unit economics / margin tracking", copper: "Yes, per-tenant", competitor: "Not advertised" },
    ],
    faqs: [
      {
        q: "We just want missed calls answered — do we need the full feature set?",
        a: "Not necessarily. If you only want messages taken, Phonely or Goodcall's free tier covers that. Copper Solo at $79/mo adds calendar booking, SMS consent, KB ingestion, and an industry-specific persona — worth it if your AI's job includes converting the call into a real booking.",
      },
    ],
    metaTitle: "Copper vs Phonely: AI receptionist comparison",
    metaDescription:
      "Honest comparison of Copper and Phonely. Calendar booking, knowledge base ingestion, vertical-specific behavior, and pricing tradeoffs.",
  },
  {
    slug: "smith-ai",
    name: "Smith.ai",
    tagline: "Hybrid AI + human receptionist service.",
    homepage: "https://smith.ai",
    summary:
      "Smith.ai is a long-established receptionist service with both human agents and an AI component. Premium-positioned, with deeper service tiers including outbound campaigns.",
    strengths: [
      "Real human receptionists when you want the human touch",
      "Established brand with deep legal-vertical playbook",
      "Outbound and intake campaign features at higher tiers",
    ],
    copperDifferentiators: [
      "Pure AI, predictable per-minute economics — no per-call premium for human handling",
      "Self-serve in under an hour vs Smith.ai's onboarding-call-required model",
      "$79/mo entry point vs Smith.ai's hundreds-of-dollars minimum",
    ],
    whenToPickThem:
      "Your calls genuinely benefit from a human on the line (high-touch professional services, premium-tier clients) and budget isn't the constraint.",
    whenToPickCopper:
      "You want AI that's good enough to convert most calls into bookings without paying a per-call human premium, and you want pricing that scales with usage instead of per-call.",
    rows: [
      { feature: "Pricing (entry)", copper: "$79/mo Solo, all-inclusive minutes", competitor: "From ~$255/mo per public plans" },
      { feature: "Receptionist type", copper: "AI, with optional human transfer", competitor: "Hybrid AI + human, depending on plan" },
      { feature: "Onboarding model", copper: "Self-serve", competitor: "Onboarding call required" },
      { feature: "Calendar booking", copper: "Built in, Google Calendar", competitor: "Built in, multiple calendars" },
      { feature: "Outbound campaigns", copper: "Not yet — roadmap", competitor: "Included at higher tiers" },
      { feature: "Industry starter packs", copper: "13 verticals", competitor: "Vertical playbooks via onboarding consult" },
    ],
    faqs: [
      {
        q: "Doesn't a real human sound better than AI?",
        a: "Often yes — but it costs 3-5x more per minute. For most SMB call volume (inbound new leads, simple service requests), Copper's AI converts comparably well at a fraction of the price. For high-touch professional services where the buyer expects a person, Smith.ai's hybrid model is the right call.",
      },
      {
        q: "Can I add a human escalation to Copper?",
        a: "Yes. Configure a transfer number in settings and the AI will offer to connect to you (or your office) for hostile callers, complex matters, or anything else you flag in the playbook.",
      },
    ],
    metaTitle: "Copper vs Smith.ai: AI vs hybrid receptionist comparison",
    metaDescription:
      "When to pick a pure AI receptionist over Smith.ai's hybrid AI+human model. Pricing, onboarding, conversion, and which fits which SMB.",
  },
  {
    slug: "lobbystack",
    name: "LobbyStack",
    tagline: "Open-source AI receptionist (AGPL-3.0).",
    homepage: "https://lobbystack.com",
    summary:
      "LobbyStack is the leading open-source AI receptionist, built on Convex + Twilio + OpenAI Realtime. Strong for teams that want to self-host or audit the entire stack.",
    strengths: [
      "Fully open-source (AGPL-3.0) — you can audit and self-host the whole stack",
      "Browser web-call widget on landing pages so prospects can try the AI before signup",
      "Bilingual (English + French) including OCR for uploaded documents",
    ],
    copperDifferentiators: [
      "Managed hosting handled for you — no Docker Compose, Caddy, or self-hosted Convex to maintain",
      "Vapi-backed voice stack means we don't carry the maintenance tax of a custom Twilio Media Streams ↔ OpenAI Realtime bridge",
      "Polished onboarding wizard with industry starter packs across 13 verticals, three-tier Stripe pricing (Solo / Business / Custom)",
    ],
    whenToPickThem:
      "You want to self-host on your own infrastructure, you need bilingual (EN+FR) support today, or open-source / auditable code is a hard requirement.",
    whenToPickCopper:
      "You want a managed product that just works, you're hosted on Vercel/Supabase already, and you'd rather pay $79/mo than maintain an OSS stack.",
    rows: [
      { feature: "License", copper: "Proprietary, hosted", competitor: "AGPL-3.0, source available" },
      { feature: "Hosting model", copper: "Managed (we run it)", competitor: "Hosted or self-host (Docker Compose)" },
      { feature: "Telephony stack", copper: "Vapi (managed)", competitor: "Twilio Media Streams ↔ OpenAI Realtime (self-managed)" },
      { feature: "Web-call widget on landing", copper: "Not yet — roadmap", competitor: "Yes, embedded on landing" },
      { feature: "Language support", copper: "English", competitor: "English + French (incl. OCR)" },
      { feature: "Billing", copper: "Stripe (Solo / Business / Custom)", competitor: "Polar usage-metered" },
      { feature: "Industry starter packs", copper: "13 verticals", competitor: "Generic" },
    ],
    faqs: [
      {
        q: "Why not just self-host LobbyStack and save the SaaS fee?",
        a: "If your team has the ops capacity, that's a legitimate path. The maintenance tax is real though — you'll be on the hook for keeping the Twilio bridge, Convex backend, embedding pipeline, and migration story alive. Copper's $79/mo Solo plan is cheaper than two hours of senior engineer time per month.",
      },
      {
        q: "Will Copper ever open-source?",
        a: "We don't have an open-source roadmap today. The product is built on Vercel + Supabase + Vapi + Stripe — proprietary platform pieces that fit a hosted SaaS shape better than self-host.",
      },
    ],
    metaTitle: "Copper vs LobbyStack: hosted SaaS vs open-source AI receptionist",
    metaDescription:
      "Choosing between Copper (managed) and LobbyStack (open-source / self-host). Hosting model, maintenance cost, feature parity, and which fits which team.",
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return COMPETITORS.find((c) => c.slug === slug);
}

export function competitorSlugs(): string[] {
  return COMPETITORS.map((c) => c.slug);
}

export const COPPER_PITCH = COPPER_TAGLINE;
