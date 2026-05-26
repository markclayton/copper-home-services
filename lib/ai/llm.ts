import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "@/lib/env";
import type { VapiTranscriptMessage } from "@/lib/voice/types";

let cached: Anthropic | null = null;

export function getLlm(): Anthropic {
  if (cached) return cached;
  cached = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  return cached;
}

const SUMMARY_MODEL = "claude-sonnet-4-6";

export type CallSummary = {
  summary: string;
  intent:
    | "emergency"
    | "service"
    | "quote"
    | "billing"
    | "existing_customer"
    | "other";
  outcome:
    | "booked"
    | "callback_promised"
    | "no_booking"
    | "transferred"
    | "hung_up";
  isEmergency: boolean;
  ownerLine: string;
};

const SUMMARIZE_TOOL: Anthropic.Tool = {
  name: "record_call_summary",
  description:
    "Record a structured summary of a phone call between an AI receptionist and a customer.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description:
          "2–4 sentence summary of who called and what happened. Plain English.",
      },
      intent: {
        type: "string",
        enum: [
          "emergency",
          "service",
          "quote",
          "billing",
          "existing_customer",
          "other",
        ],
        description: "Primary reason the customer called.",
      },
      outcome: {
        type: "string",
        enum: [
          "booked",
          "callback_promised",
          "no_booking",
          "transferred",
          "hung_up",
        ],
        description: "How the call resolved.",
      },
      isEmergency: {
        type: "boolean",
        description:
          "True when the caller described an urgent, dangerous, or active-damage situation.",
      },
      ownerLine: {
        type: "string",
        description:
          "A single short line (~120 chars) suitable for an SMS to the business owner.",
      },
    },
    required: ["summary", "intent", "outcome", "isEmergency", "ownerLine"],
  },
};

function transcriptToText(messages: VapiTranscriptMessage[]): string {
  return messages
    .filter((m) => m.message)
    .map((m) => `${m.role.toUpperCase()}: ${m.message}`)
    .join("\n");
}

export async function summarizeCall(
  transcript: VapiTranscriptMessage[] | string,
): Promise<CallSummary> {
  const client = getLlm();
  const text =
    typeof transcript === "string" ? transcript : transcriptToText(transcript);

  const response = await client.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 1024,
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
    tools: [SUMMARIZE_TOOL],
    tool_choice: { type: "tool", name: "record_call_summary" },
    messages: [
      {
        role: "user",
        content: `Summarize the following call transcript. Be terse and accurate.\n\n${text}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("LLM did not return a tool call.");
  }
  return toolUse.input as CallSummary;
}
