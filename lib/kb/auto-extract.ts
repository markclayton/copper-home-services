/**
 * Auto-extract structured KB fields (services + FAQs) from crawled
 * website pages. Run once at the end of a successful crawl so the
 * onboarding wizard can pre-fill the services step with sensible
 * defaults that the owner reviews and edits.
 *
 * Uses Anthropic's tool-use mode to force a clean JSON shape, same
 * pattern as summarizeCall.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getLlm, type LlmUsage } from "@/lib/ai/llm";

const EXTRACT_MODEL = "claude-sonnet-4-6";

export type ExtractedService = {
  name: string;
  description?: string;
  priceRange?: string;
};

export type ExtractedFaq = {
  q: string;
  a: string;
};

export type Extraction = {
  services: ExtractedService[];
  faqs: ExtractedFaq[];
  usage: LlmUsage | null;
};

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "record_kb_extraction",
  description:
    "Record the services offered and a short FAQ list derived from a small business's public website pages.",
  input_schema: {
    type: "object",
    properties: {
      services: {
        type: "array",
        description:
          "Up to 12 services the business offers. Name them as a customer would say them. Skip generic categories.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: {
              type: "string",
              description: "Optional 1-sentence description.",
            },
            priceRange: {
              type: "string",
              description:
                "Optional price range as shown on the site (e.g. '$150-$300'). Omit if the site doesn't say.",
            },
          },
          required: ["name"],
        },
      },
      faqs: {
        type: "array",
        description:
          "Up to 8 FAQs a caller might ask. Pull literal Q&A pairs from the site when present; otherwise infer from policies, About copy, service descriptions.",
        items: {
          type: "object",
          properties: {
            q: { type: "string" },
            a: { type: "string" },
          },
          required: ["q", "a"],
        },
      },
    },
    required: ["services", "faqs"],
  },
};

/**
 * Pass the concatenated text of crawled pages. We cap the input at ~80K
 * characters (~20K tokens) — more than enough for an SMB site and keeps
 * one extraction well under model context limits.
 */
export async function extractKbFromPages(args: {
  businessName: string;
  pages: Array<{ url: string; title: string; text: string }>;
}): Promise<Extraction> {
  if (args.pages.length === 0) {
    return { services: [], faqs: [], usage: null };
  }

  const corpus = args.pages
    .map((p) => `# ${p.title}\nURL: ${p.url}\n\n${p.text}`)
    .join("\n\n---\n\n")
    .slice(0, 80_000);

  const client = getLlm();
  const response = await client.messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 2048,
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "record_kb_extraction" },
    messages: [
      {
        role: "user",
        content: `Below are pages from ${args.businessName}'s public website. Extract the services they offer and a short FAQ list, in the caller's voice. Be specific — don't invent pricing or policies the site doesn't state.\n\n${corpus}`,
      },
    ],
  });

  const usage: LlmUsage = {
    model: EXTRACT_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    return { services: [], faqs: [], usage };
  }
  const input = toolUse.input as Pick<Extraction, "services" | "faqs">;
  return {
    services: Array.isArray(input.services) ? input.services.slice(0, 12) : [],
    faqs: Array.isArray(input.faqs) ? input.faqs.slice(0, 8) : [],
    usage,
  };
}
