import { getLlm } from "./llm";
import type { Business, KnowledgeBase } from "@/lib/db/schema";

export type SmsHistoryMessage = {
  direction: "inbound" | "outbound";
  body: string;
};

const SMS_MODEL = "anthropic/claude-haiku-4.5";

// Cap on conversation history sent to the LLM. SMS conversations rarely
// run long; this keeps prompts cheap and focused on the recent exchange.
const HISTORY_MAX_MESSAGES = 20;

// Max tokens for the reply. SMS replies should be short — texts longer than
// ~320 chars get split into multiple segments at carrier level.
const REPLY_MAX_TOKENS = 200;

export type SmsReply = {
  body: string;
  flagForOwner: boolean;
  flagReason: string | null;
};

type Hours = Record<
  string,
  { open: string; close: string; closed?: boolean }
>;

function buildSystemPrompt(
  business: Business,
  kb: KnowledgeBase | null,
): string {
  const hours = (business.hours as Hours | null) ?? null;
  const hoursText = hours
    ? Object.entries(hours)
        .map(([day, h]) =>
          h.closed ? `${day}: closed` : `${day}: ${h.open}–${h.close}`,
        )
        .join(", ")
    : "(no hours configured)";

  const services = kb?.services
    ? JSON.stringify(kb.services, null, 0).slice(0, 1200)
    : "(no service list)";
  const faqs = kb?.faqs
    ? JSON.stringify(kb.faqs, null, 0).slice(0, 1200)
    : "(no FAQs)";

  return `You are the SMS assistant for ${business.name}, a home services business. You're texting a customer back on the business's main number.

# How to write
- Keep replies short — one to three sentences max, ideally under 160 characters.
- Sound like a friendly receptionist who knows the trades, not a chatbot. No emoji unless the customer used one first.
- Don't say "I'm an AI" or "I'm a virtual assistant" unless directly asked.
- Don't open every reply with a greeting — this is a conversation, not a first contact.
- Never invent prices, hours, or policies that aren't below.

# What you can do
- Answer questions using the FAQs and service list below.
- Acknowledge service requests and tell the customer the owner will get back to them shortly.
- For booking requests, ask the customer to call the number directly (${business.twilioNumber ?? "the business line"}) so you can confirm timing live. Don't promise specific appointment times over SMS.

# When to escalate (set flag_for_owner=true)
- The customer describes anything that sounds urgent: gas smell, no heat in winter, no AC in extreme heat, active water leak, electrical sparking, smoke. Reply briefly acknowledging the urgency and tell them the owner is being alerted immediately.
- The customer asks for a callback or a quote that requires the owner.
- The customer is angry or asking to cancel work.
- The customer asks a question the FAQs don't cover and you can't confidently answer from the service list.

For non-urgent escalations, your reply should say something like "Let me have the owner reach out — they'll be in touch shortly." For urgent ones, lead with acknowledgement: "That sounds urgent — I'm alerting the owner now, they'll call you back ASAP."

# Business context

Business: ${business.name}
Phone: ${business.twilioNumber ?? "(not set)"}
Owner: ${business.ownerName}
Timezone: ${business.timezone}
Hours: ${hoursText}

Services offered (JSON):
${services}

FAQs (JSON):
${faqs}

${kb?.brandVoiceNotes ? `Brand voice notes from the owner: ${kb.brandVoiceNotes}` : ""}
${kb?.emergencyCriteria ? `What counts as an emergency for this business: ${kb.emergencyCriteria}` : ""}
${kb?.afterHoursPolicy ? `After-hours policy: ${kb.afterHoursPolicy}` : ""}`;
}

const REPLY_TOOL = {
  type: "function" as const,
  function: {
    name: "send_sms_reply",
    description: "Send a text-message reply back to the customer.",
    parameters: {
      type: "object",
      properties: {
        body: {
          type: "string",
          description:
            "The text to send. One to three sentences, ideally under 160 characters.",
        },
        flag_for_owner: {
          type: "boolean",
          description:
            "True if the owner needs to follow up personally — urgent issues, callback requests, cancellations, or questions you couldn't answer confidently.",
        },
        flag_reason: {
          type: "string",
          description:
            "If flag_for_owner is true, a one-sentence summary of what the owner needs to handle. Otherwise empty string.",
        },
      },
      required: ["body", "flag_for_owner", "flag_reason"],
      additionalProperties: false,
    },
  },
};

export async function generateSmsReply(args: {
  business: Business;
  kb: KnowledgeBase | null;
  history: SmsHistoryMessage[];
  newMessage: string;
}): Promise<SmsReply> {
  const client = getLlm();
  const system = buildSystemPrompt(args.business, args.kb);

  // Trim to the most recent N messages so context stays cheap. The newMessage
  // is appended separately as the live turn.
  const trimmed = args.history.slice(-HISTORY_MAX_MESSAGES);

  const conversation = trimmed.map((m) => ({
    role: (m.direction === "inbound" ? "user" : "assistant") as
      | "user"
      | "assistant",
    content: m.body,
  }));

  const response = await client.chat.completions.create({
    model: SMS_MODEL,
    max_tokens: REPLY_MAX_TOKENS,
    tools: [REPLY_TOOL],
    tool_choice: {
      type: "function",
      function: { name: "send_sms_reply" },
    },
    messages: [
      { role: "system", content: system },
      ...conversation,
      { role: "user", content: args.newMessage },
    ],
  });

  const toolCall = response.choices[0]?.message.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function") {
    throw new Error("SMS LLM did not return a tool call.");
  }

  const parsed = JSON.parse(toolCall.function.arguments) as {
    body: string;
    flag_for_owner: boolean;
    flag_reason: string;
  };

  return {
    body: parsed.body.trim(),
    flagForOwner: parsed.flag_for_owner,
    flagReason: parsed.flag_reason?.trim() || null,
  };
}
