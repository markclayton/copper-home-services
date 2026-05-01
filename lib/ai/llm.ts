import OpenAI from "openai";
import { env, requireEnv } from "@/lib/env";
import type { VapiTranscriptMessage } from "@/lib/voice/types";

let cached: OpenAI | null = null;

export function getLlm(): OpenAI {
  if (cached) return cached;
  cached = new OpenAI({
    apiKey: requireEnv("OPENROUTER_API_KEY"),
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": env.APP_URL,
      "X-Title": "Copper",
    },
  });
  return cached;
}

const SUMMARY_MODEL = "anthropic/claude-sonnet-4.5";

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

const SUMMARIZE_TOOL = {
  type: "function" as const,
  function: {
    name: "record_call_summary",
    description:
      "Record a structured summary of a phone call between an AI receptionist and a customer.",
    parameters: {
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
      additionalProperties: false,
    },
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

  const response = await client.chat.completions.create({
    model: SUMMARY_MODEL,
    max_tokens: 512,
    tools: [SUMMARIZE_TOOL],
    tool_choice: {
      type: "function",
      function: { name: "record_call_summary" },
    },
    messages: [
      {
        role: "user",
        content: `Summarize the following call transcript. Be terse and accurate.\n\n${text}`,
      },
    ],
  });

  const toolCall = response.choices[0]?.message.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function") {
    throw new Error("LLM did not return a tool call.");
  }
  return JSON.parse(toolCall.function.arguments) as CallSummary;
}
