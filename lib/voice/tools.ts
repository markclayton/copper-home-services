/**
 * Tool definitions exposed to the Vapi assistant.
 * Function tools' server.url points at our webhook; Vapi POSTs tool-calls
 * messages there and waits synchronously for a response.
 *
 * The built-in transferCall tool is wired separately — Vapi handles the SIP
 * transfer itself and our webhook is not involved at runtime.
 */

import { env } from "@/lib/env";
import type { Business } from "@/lib/db/schema";

type Server = { url: string; secret?: string };

export type VapiFunctionTool = {
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
  server?: Server;
};

export type VapiTransferCallTool = {
  type: "transferCall";
  destinations: Array<{
    type: "number";
    number: string;
    message?: string;
    description?: string;
  }>;
};

export type VapiToolDef = VapiFunctionTool | VapiTransferCallTool;

/**
 * Build the full assistant tool set for a tenant. The transferCall tool is
 * only included when the owner has set a transfer number — otherwise the
 * model can't call it (and the prompt instructs it to take a message
 * instead).
 */
export function buildToolDefs(business: Business): VapiToolDef[] {
  const serverUrl = `${env.APP_URL}/api/webhooks/vapi/${business.id}`;
  const secret = env.VAPI_WEBHOOK_SECRET;
  const server: Server = secret ? { url: serverUrl, secret } : { url: serverUrl };

  const tools: VapiToolDef[] = [
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
    {
      type: "function",
      function: {
        name: "take_message",
        description:
          "Capture a message for the owner. Use this when the caller wants the owner to call back about something the assistant can't resolve directly (specific staff member, complaint, vendor inquiry, etc.). Confirm the message back to the caller in your own words before calling this tool.",
        parameters: {
          type: "object",
          properties: {
            caller_name: { type: "string" },
            caller_phone: {
              type: "string",
              description: "Best callback number in E.164 format.",
            },
            subject: {
              type: "string",
              description:
                "One short phrase: what the message is about (e.g. 'invoice question', 'follow-up on yesterday's quote').",
            },
            message: {
              type: "string",
              description:
                "The full message in the caller's words, verbatim where reasonable.",
            },
          },
          required: ["caller_phone", "message"],
        },
      },
      server,
    },
    {
      type: "function",
      function: {
        name: "lookup_appointment_for_change",
        description:
          "Look up the caller's upcoming appointments by phone number. Use this FIRST when the caller wants to cancel or reschedule. Returns the appointment id and details needed for the next steps.",
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
        name: "send_appointment_change_otp",
        description:
          "Send a 6-digit verification code by SMS to the phone on file for an appointment. The caller must read this code back before any change is allowed. Tell the caller you're texting it and wait for them to read it.",
        parameters: {
          type: "object",
          properties: {
            appointment_id: {
              type: "string",
              description:
                "Appointment UUID returned by lookup_appointment_for_change.",
            },
          },
          required: ["appointment_id"],
        },
      },
      server,
    },
    {
      type: "function",
      function: {
        name: "verify_appointment_change_otp",
        description:
          "Verify the 6-digit code the caller read back. Returns success or failure. On success the caller is authorized to cancel or reschedule this specific appointment for the next 5 minutes.",
        parameters: {
          type: "object",
          properties: {
            appointment_id: { type: "string" },
            code: {
              type: "string",
              description: "Exactly the 6 digits the caller read back.",
            },
          },
          required: ["appointment_id", "code"],
        },
      },
      server,
    },
    {
      type: "function",
      function: {
        name: "cancel_appointment",
        description:
          "Cancel an appointment. Only call this AFTER verify_appointment_change_otp succeeded for this appointment in the current call.",
        parameters: {
          type: "object",
          properties: {
            appointment_id: { type: "string" },
          },
          required: ["appointment_id"],
        },
      },
      server,
    },
    {
      type: "function",
      function: {
        name: "reschedule_appointment",
        description:
          "Move an appointment to a new start time. Only call this AFTER verify_appointment_change_otp succeeded for this appointment in the current call. Call get_available_slots first to pick a real opening.",
        parameters: {
          type: "object",
          properties: {
            appointment_id: { type: "string" },
            new_start_at_iso: {
              type: "string",
              description:
                "ISO 8601 start time the caller agreed to. Should be a slot returned by get_available_slots.",
            },
          },
          required: ["appointment_id", "new_start_at_iso"],
        },
      },
      server,
    },
  ];

  if (business.transferNumber) {
    tools.push({
      type: "transferCall",
      destinations: [
        {
          type: "number",
          number: business.transferNumber,
          message:
            "I'm connecting you with the owner now. Please hold for just a moment.",
          description: "Live transfer to the business owner.",
        },
      ],
    });
  }

  return tools;
}
