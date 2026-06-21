/**
 * Pause / resume a tenant's Vapi assistant when an abuse-prevention
 * threshold trips (today: trial-window voice-minute cap). We don't
 * detach the phone number — that would risk losing it — we patch the
 * assistant in place so inbound calls still answer but only long
 * enough to deliver a short "service paused" notice and hang up.
 *
 * Resume is just re-running the normal deploy, which re-renders the
 * full prompt + tools and PATCHes the existing assistant id back to
 * its working state.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, events, type Business } from "@/lib/db/schema";
import { updateAssistant } from "./vapi";
import { deployAssistant } from "./deploy";

const PAUSED_FIRST_MESSAGE =
  "Thanks for calling. This account is on a trial that's reached its " +
  "usage limit. The business owner has been notified — please try again " +
  "shortly or check back later.";

export async function pauseAssistantForOverage(
  business: Business,
  reason: "trial_voice_cap" | "trial_llm_budget",
): Promise<{ ok: boolean; reason?: string }> {
  if (!business.vapiAssistantId) {
    return { ok: false, reason: "no_assistant_id" };
  }

  try {
    await updateAssistant(business.vapiAssistantId, {
      firstMessage: PAUSED_FIRST_MESSAGE,
      // Keep the model field minimal — Vapi requires it on PATCH. The
      // assistant will greet, then hit endCall on the silence timeout.
      model: {
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
        messages: [
          {
            role: "system",
            content:
              "You are paused. Do not assist. If the caller speaks, " +
              "politely repeat that the service is temporarily " +
              "unavailable and end the call.",
          },
        ],
      },
      maxDurationSeconds: 30,
      silenceTimeoutSeconds: 5,
    });
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  await db
    .update(businesses)
    .set({ updatedAt: new Date() })
    .where(eq(businesses.id, business.id));

  await db.insert(events).values({
    businessId: business.id,
    type: "voice.assistant_paused",
    payload: { reason },
  });

  return { ok: true };
}

export async function resumeAssistantFromOverage(
  business: Business,
): Promise<{ ok: boolean; reason?: string }> {
  const result = await deployAssistant(business.id);
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }
  await db.insert(events).values({
    businessId: business.id,
    type: "voice.assistant_resumed",
    payload: { assistantId: result.assistantId, action: result.action },
  });
  return { ok: true };
}
