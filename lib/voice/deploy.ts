/**
 * Deploys the Vapi assistant for a tenant: render prompt, build tool defs,
 * create or update the assistant via Vapi REST. Idempotent — safe to call from
 * the settings save handler and from provisioning.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, knowledgeBase } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { renderAssistantPrompt } from "./prompt-template";
import { buildToolDefs } from "./tools";
import {
  createAssistant,
  updateAssistant,
  type VapiAssistantConfig,
} from "./vapi";

const DEFAULT_VOICE = { provider: "vapi", voiceId: "Elliot" };
const DEFAULT_TRANSCRIBER = {
  provider: "deepgram",
  model: "nova-2",
  language: "en",
};
const IN_CALL_MODEL = {
  provider: "anthropic",
  model: "claude-haiku-4-5-20251001",
  temperature: 0.6,
};

export type DeployResult =
  | { ok: true; assistantId: string; action: "created" | "updated" }
  | { ok: false; reason: string };

export async function deployAssistant(
  businessId: string,
): Promise<DeployResult> {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (!business) return { ok: false, reason: "business not found" };

  const [kb] = await db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.businessId, businessId))
    .limit(1);
  if (!kb) {
    return {
      ok: false,
      reason: "knowledge base not configured for this tenant",
    };
  }

  if (!env.VAPI_API_KEY) {
    return { ok: false, reason: "VAPI_API_KEY not set" };
  }

  const systemPrompt = renderAssistantPrompt(business, kb);
  const tools = buildToolDefs(businessId);

  const config: VapiAssistantConfig = {
    name: `${business.name} Receptionist`,
    firstMessage: `Hi! Thanks for calling ${business.name}. I'm the AI assistant — how can I help?`,
    model: {
      ...IN_CALL_MODEL,
      messages: [{ role: "system", content: systemPrompt }],
      tools,
    },
    voice: DEFAULT_VOICE,
    transcriber: DEFAULT_TRANSCRIBER,
    server: env.VAPI_WEBHOOK_SECRET
      ? {
          url: `${env.APP_URL}/api/webhooks/vapi/${businessId}`,
          secret: env.VAPI_WEBHOOK_SECRET,
        }
      : { url: `${env.APP_URL}/api/webhooks/vapi/${businessId}` },
    endCallFunctionEnabled: true,
    recordingEnabled: true,
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 600,
  };

  if (business.vapiAssistantId) {
    await updateAssistant(business.vapiAssistantId, config);
    return {
      ok: true,
      assistantId: business.vapiAssistantId,
      action: "updated",
    };
  }

  const created = await createAssistant(config);
  await db
    .update(businesses)
    .set({ vapiAssistantId: created.id, updatedAt: new Date() })
    .where(eq(businesses.id, businessId));

  return { ok: true, assistantId: created.id, action: "created" };
}
