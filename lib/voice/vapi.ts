/**
 * Vapi REST client — narrow surface used by the speed-to-lead flow and
 * provisioning. Webhook handling lives in the route at
 * app/api/webhooks/vapi/[business_id]/route.ts.
 *
 * Docs: https://docs.vapi.ai/api-reference
 */

import { requireEnv } from "@/lib/env";

const VAPI_BASE = "https://api.vapi.ai";

type VapiInit = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

async function vapiFetch<T>(path: string, opts: VapiInit = {}): Promise<T> {
  const apiKey = requireEnv("VAPI_API_KEY");
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi ${opts.method ?? "GET"} ${path} ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export type CreateOutboundCallArgs = {
  phoneNumberId: string;
  assistantId: string;
  customerNumber: string;
  customerName?: string;
  metadata?: Record<string, unknown>;
};

type VapiCallResponse = {
  id: string;
  orgId: string;
  status: string;
  type: string;
  createdAt: string;
};

export async function createOutboundCall(args: CreateOutboundCallArgs) {
  return vapiFetch<VapiCallResponse>("/call/phone", {
    method: "POST",
    body: {
      phoneNumberId: args.phoneNumberId,
      assistantId: args.assistantId,
      customer: {
        number: args.customerNumber,
        name: args.customerName,
      },
      metadata: args.metadata,
    },
  });
}

/**
 * Vapi assistant config — narrow shape covering what we manage from this app.
 * Vapi accepts many more fields; the ones we don't set fall back to provider
 * defaults at the org level.
 */
export type VapiAssistantConfig = {
  name: string;
  firstMessage: string;
  model: {
    provider: string;
    model: string;
    temperature?: number;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    tools?: unknown[];
  };
  voice?: {
    provider: string;
    voiceId: string;
  };
  transcriber?: {
    provider: string;
    model?: string;
    language?: string;
  };
  server?: {
    url: string;
    secret?: string;
  };
  endCallFunctionEnabled?: boolean;
  recordingEnabled?: boolean;
  silenceTimeoutSeconds?: number;
  maxDurationSeconds?: number;
};

type VapiAssistantResponse = {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export async function createAssistant(config: VapiAssistantConfig) {
  return vapiFetch<VapiAssistantResponse>("/assistant", {
    method: "POST",
    body: config,
  });
}

export async function updateAssistant(
  assistantId: string,
  config: Partial<VapiAssistantConfig>,
) {
  return vapiFetch<VapiAssistantResponse>(`/assistant/${assistantId}`, {
    method: "PATCH",
    body: config,
  });
}

export async function getAssistant(assistantId: string) {
  return vapiFetch<VapiAssistantResponse>(`/assistant/${assistantId}`);
}

export type RegisterPhoneNumberArgs = {
  number: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  name: string;
  assistantId?: string;
};

type VapiPhoneNumberResponse = {
  id: string;
  orgId: string;
  number: string;
  provider: string;
  createdAt: string;
};

/**
 * Registers a Twilio phone number with Vapi so that inbound calls are
 * answered by the linked assistant. Vapi will configure the Twilio voice URL
 * to its own SIP endpoint as part of registration.
 */
export async function registerPhoneNumber(args: RegisterPhoneNumberArgs) {
  return vapiFetch<VapiPhoneNumberResponse>("/phone-number", {
    method: "POST",
    body: {
      provider: "twilio",
      number: args.number,
      twilioAccountSid: args.twilioAccountSid,
      twilioAuthToken: args.twilioAuthToken,
      name: args.name,
      assistantId: args.assistantId,
    },
  });
}

export async function updatePhoneNumber(
  phoneNumberId: string,
  patch: { assistantId?: string; name?: string },
) {
  return vapiFetch<VapiPhoneNumberResponse>(`/phone-number/${phoneNumberId}`, {
    method: "PATCH",
    body: patch,
  });
}

export async function deleteAssistant(assistantId: string) {
  return vapiFetch<{ id: string }>(`/assistant/${assistantId}`, {
    method: "DELETE",
  });
}

export async function deletePhoneNumber(phoneNumberId: string) {
  return vapiFetch<{ id: string }>(`/phone-number/${phoneNumberId}`, {
    method: "DELETE",
  });
}
