/**
 * Tool definitions exposed to the Vapi assistant.
 * Each tool's `server.url` points at our webhook; Vapi will POST tool-calls
 * messages there during the call and wait for a response.
 */

import { env } from "@/lib/env";

export type VapiToolDef = {
  type: "function";
  async?: boolean;
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
  server?: {
    url: string;
    secret?: string;
  };
};

export function buildToolDefs(businessId: string): VapiToolDef[] {
  const serverUrl = `${env.APP_URL}/api/webhooks/vapi/${businessId}`;
  const secret = env.VAPI_WEBHOOK_SECRET;
  const server = secret ? { url: serverUrl, secret } : { url: serverUrl };

  return [
    {
      type: "function",
      function: {
        name: "get_available_slots",
        description:
          "List available appointment slots for a date range. Call this BEFORE book_appointment so you can offer real options to the caller.",
        parameters: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date YYYY-MM-DD (inclusive).",
            },
            end_date: {
              type: "string",
              description:
                "End date YYYY-MM-DD (inclusive). Default to start_date + 3 days if unsure.",
            },
          },
          required: ["start_date", "end_date"],
        },
      },
      server,
    },
    {
      type: "function",
      function: {
        name: "book_appointment",
        description:
          "Book a specific slot returned by get_available_slots. Before calling this you MUST have (1) the caller's verbal agreement to a specific time, and (2) their explicit yes/no on whether we may text them a confirmation. Pass that yes/no as sms_consent.",
        parameters: {
          type: "object",
          properties: {
            start_at_iso: {
              type: "string",
              description:
                "Exact start time of the slot in ISO 8601 (e.g. 2026-05-04T17:00:00.000Z). Must match a slot returned by get_available_slots.",
            },
            service_type: {
              type: "string",
              description: "The service requested (e.g. 'AC repair').",
            },
            address: { type: "string", description: "Service address." },
            customer_name: { type: "string" },
            customer_phone: { type: "string" },
            customer_email: {
              type: "string",
              description:
                "Caller's email if collected; otherwise omit and we'll use a placeholder.",
            },
            notes: { type: "string", description: "Issue description." },
            sms_consent: {
              type: "boolean",
              description:
                "REQUIRED. True only if the caller explicitly said yes when you asked permission to text them a confirmation and pre-arrival reminder. If they declined, said 'no', or were ambiguous, set this to false — the appointment will still be booked but no SMS will be sent.",
            },
          },
          required: [
            "start_at_iso",
            "service_type",
            "address",
            "customer_phone",
            "customer_name",
            "sms_consent",
          ],
        },
      },
      server,
    },
    {
      type: "function",
      function: {
        name: "lookup_existing_customer",
        description:
          "Check if the caller is an existing customer by phone number.",
        parameters: {
          type: "object",
          properties: {
            phone: {
              type: "string",
              description: "Caller's phone number in E.164 format.",
            },
          },
          required: ["phone"],
        },
      },
      server,
    },
    {
      type: "function",
      function: {
        name: "send_emergency_alert",
        description:
          "Notify the owner immediately about an emergency. Use whenever the caller describes an urgent or dangerous situation.",
        parameters: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "One-sentence summary of the emergency.",
            },
            address: { type: "string", description: "Service address." },
            customer_phone: { type: "string" },
          },
          required: ["summary", "customer_phone"],
        },
      },
      server,
    },
    {
      type: "function",
      function: {
        name: "send_quote_followup",
        description:
          "Queue a callback with a quote. Use when the caller is asking for pricing the assistant cannot quote directly.",
        parameters: {
          type: "object",
          properties: {
            details: {
              type: "string",
              description: "What the caller wants quoted.",
            },
            customer_phone: { type: "string" },
            customer_name: { type: "string" },
          },
          required: ["details", "customer_phone"],
        },
      },
      server,
    },
  ];
}
