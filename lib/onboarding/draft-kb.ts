/**
 * AI-drafted knowledge base. Owner enters their website URL, server fetches
 * the page, sends raw text to OpenRouter, returns structured services / FAQs /
 * pricing. Pre-populates the form so owners review-and-edit instead of
 * write-from-scratch.
 */

import { getLlm } from "@/lib/ai/llm";

const DRAFT_MODEL = "anthropic/claude-sonnet-4.5";

const DRAFT_TOOL = {
  type: "function" as const,
  function: {
    name: "record_kb_draft",
    description:
      "Extract a structured knowledge base draft for a home services business from raw website text.",
    parameters: {
      type: "object",
      properties: {
        services: {
          type: "array",
          description: "List of services the business offers.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              priceRange: {
                type: "string",
                description:
                  "Approximate price (e.g. '$150 + parts'). Empty if not stated.",
              },
              typicalDuration: {
                type: "string",
                description: "e.g. '1-2 hours'. Empty if unknown.",
              },
            },
            required: ["name"],
          },
        },
        faqs: {
          type: "array",
          description: "Q&A pairs that callers commonly ask.",
          items: {
            type: "object",
            properties: {
              q: { type: "string" },
              a: { type: "string" },
            },
            required: ["q", "a"],
          },
        },
        pricing: {
          type: "object",
          description:
            "Flat numeric prices keyed by short identifier. Use only when the page shows specific dollar amounts.",
          additionalProperties: true,
        },
        policies: {
          type: "object",
          description:
            "Key/value policies — payment methods, warranty, after-hours rules, etc.",
          additionalProperties: true,
        },
        emergencyCriteria: {
          type: "string",
          description:
            "What kind of issue counts as an emergency for this business. Plain text.",
        },
        brandVoiceNotes: {
          type: "string",
          description:
            "1-2 sentences capturing the tone of the business based on their website copy.",
        },
      },
      required: ["services", "faqs"],
      additionalProperties: false,
    },
  },
};

export type KbDraft = {
  services: Array<{
    name: string;
    priceRange?: string;
    typicalDuration?: string;
  }>;
  faqs: Array<{ q: string; a: string }>;
  pricing: Record<string, unknown>;
  policies: Record<string, unknown>;
  emergencyCriteria: string;
  brandVoiceNotes: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSite(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CopperBot/1.0; +https://copper.dev)",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch ${url} returned ${res.status}`);
  }
  const html = await res.text();
  return stripHtml(html).slice(0, 20_000);
}

export async function draftKbFromUrl(url: string): Promise<KbDraft> {
  const text = await fetchSite(url);
  const client = getLlm();

  const response = await client.chat.completions.create({
    model: DRAFT_MODEL,
    max_tokens: 1500,
    tools: [DRAFT_TOOL],
    tool_choice: { type: "function", function: { name: "record_kb_draft" } },
    messages: [
      {
        role: "user",
        content: `Extract a knowledge base for this home services business from their website text below. Be conservative — only include services, prices, and FAQs that are clearly stated on the page. Don't invent details.\n\nWEBSITE TEXT:\n${text}`,
      },
    ],
  });

  const toolCall = response.choices[0]?.message.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function") {
    throw new Error("LLM did not return a tool call.");
  }
  const parsed = JSON.parse(toolCall.function.arguments) as Partial<KbDraft>;
  return {
    services: parsed.services ?? [],
    faqs: parsed.faqs ?? [],
    pricing: parsed.pricing ?? {},
    policies: parsed.policies ?? {},
    emergencyCriteria: parsed.emergencyCriteria ?? "",
    brandVoiceNotes: parsed.brandVoiceNotes ?? "",
  };
}
