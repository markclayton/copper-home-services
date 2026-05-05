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
              description: {
                type: "string",
                description:
                  "1-2 sentence description of the service — what's included, what to expect. Pull directly from the website copy when possible.",
              },
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
    description?: string;
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
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchOne(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CopperBot/1.0; +https://copper.dev)",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const text = stripHtml(html);
    return text.length < 50 ? null : text;
  } catch {
    return null;
  }
}

const COMMON_SUBPATHS = [
  "",
  "/services",
  "/pricing",
  "/about",
  "/faq",
  "/faqs",
];

/**
 * Fetches the homepage plus a few common subpaths and concatenates the text.
 * Most home-services marketing sites scatter the relevant info across pages,
 * so reading only the homepage misses services half the time.
 */
async function fetchSite(rawUrl: string): Promise<string> {
  const base = new URL(rawUrl);
  base.search = "";
  base.hash = "";
  const root = base.toString().replace(/\/$/, "");

  const urls = COMMON_SUBPATHS.map((path) => `${root}${path}`);
  const pages = await Promise.all(urls.map(fetchOne));

  const seen = new Set<string>();
  const chunks: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const text = pages[i];
    if (!text) continue;
    // skip duplicates (homepage often equals subpath when 404 redirects)
    const head = text.slice(0, 200);
    if (seen.has(head)) continue;
    seen.add(head);
    chunks.push(`### ${urls[i]}\n${text}`);
  }

  if (chunks.length === 0) {
    throw new Error(
      "Couldn't reach that website (or it returned no readable content). Double-check the URL or fill the form below manually.",
    );
  }

  return chunks.join("\n\n").slice(0, 40_000);
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
