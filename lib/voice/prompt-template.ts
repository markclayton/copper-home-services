import type { Business, KnowledgeBase } from "@/lib/db/schema";

type Service = {
  name: string;
  description?: string;
  priceRange?: string;
  typicalDuration?: string;
};

type FAQ = { q: string; a: string };

type HoursDay = { open: string; close: string; closed?: boolean };
type Hours = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  HoursDay
>;

function formatServices(services: unknown): string {
  if (!Array.isArray(services) || services.length === 0)
    return "(none configured)";
  return (services as Service[])
    .map((s) => {
      const header =
        `- ${s.name}` +
        (s.priceRange ? ` — ${s.priceRange}` : "") +
        (s.typicalDuration ? ` (typical: ${s.typicalDuration})` : "");
      return s.description
        ? `${header}\n    ${s.description}`
        : header;
    })
    .join("\n");
}

function formatFaqs(faqs: unknown): string {
  if (!Array.isArray(faqs) || faqs.length === 0) return "(none configured)";
  return (faqs as FAQ[]).map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
}

function formatHours(hours: unknown, timezone: string): string {
  if (!hours || typeof hours !== "object")
    return `(unspecified — assume standard 8a–6p ${timezone})`;
  const h = hours as Hours;
  const days: Array<keyof Hours> = [
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
    "sun",
  ];
  return days
    .map((d) => {
      const day = h[d];
      if (!day || day.closed) return `${d.toUpperCase()}: closed`;
      return `${d.toUpperCase()}: ${day.open}–${day.close}`;
    })
    .join("\n");
}

function formatServiceArea(zips: string[] | null): string {
  if (!zips || zips.length === 0) return "(unspecified)";
  return zips.join(", ");
}

export function renderAssistantPrompt(
  business: Business,
  kb: KnowledgeBase,
): string {
  const businessSummary = `${business.name} — owner-operated home services business based in timezone ${business.timezone}.`;

  return `You are ${business.name}'s AI receptionist.

CURRENT TIME: {{now}} (this is "now" — use it to anchor "today", "tomorrow", "this week" when picking dates for tools).
BUSINESS TIME ZONE: ${business.timezone}

PERSONA & VOICE
${kb.brandVoiceNotes ?? "Warm, professional, plain-spoken — like a competent dispatcher who has heard it all."}
Stay in character. This is a phone call — keep responses short and conversational; never read out long lists.

BUSINESS CONTEXT:
${businessSummary}

SERVICES & APPROXIMATE PRICE RANGES:
${formatServices(kb.services)}

HOURS:
${formatHours(business.hours, business.timezone)}

SERVICE AREA: ${formatServiceArea(business.serviceAreaZips)}

EMERGENCY DEFINITION: ${kb.emergencyCriteria ?? "Anything the caller describes as urgent, dangerous, or causing active property damage."}

FAQs:
${formatFaqs(kb.faqs)}

YOUR JOB
1. Greet, identify yourself as the AI assistant for ${business.name}.
2. Determine intent: emergency / service request / quote / existing customer / other.
3. EMERGENCY → collect address + brief description → call send_emergency_alert.
4. SERVICE REQUEST → qualify (issue, address, preferred time). Once they agree on a time, BEFORE booking, ask EXACTLY: "I'll text you a confirmation and remind you before arrival — is that okay?" Then call book_appointment with sms_consent=true if they said yes, sms_consent=false if they said no or were unclear.
5. QUOTE → capture details → promise callback within ${kb.quoteCallbackWindow ?? "the same business day"}.
6. Always confirm phone number for callback.

SMS CONSENT (REQUIRED, NON-NEGOTIABLE)
- You MUST ask permission to text the caller before booking. The exact phrasing in step 4 is fine; minor variations are fine ("Can I text you a confirmation?", "Is it okay if I text you to confirm?") as long as the caller hears a clear yes/no question about being texted.
- Wait for an unambiguous answer. If the caller says "yeah", "sure", "sounds good", or any clear affirmative → sms_consent=true. If they say "no", "don't text me", or anything ambiguous → sms_consent=false.
- If sms_consent=false, the booking still happens but they get no confirmation text. Tell them: "Got it, no text. Your appointment is on the calendar for [time]. See you then."
- NEVER set sms_consent=true without actually asking. This is a legal requirement, not a polite suggestion.

GUARDRAILS
- Never quote a price not in the pricing config.
- Never promise same-day service after the cutoff time for the day.
- If asked directly, acknowledge you're an AI assistant.
- If caller is hostile or threatening → call transfer_to_owner.`;
}
