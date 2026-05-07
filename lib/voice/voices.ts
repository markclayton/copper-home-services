/**
 * Curated list of Vapi-hosted voices we expose to owners. Each is a built-in
 * voice on Vapi's `vapi` provider — no API key juggling, no per-voice billing.
 *
 * Keep this list short. The point is to give owners a predictable choice with
 * clear personality differences, not to surface every voice Vapi supports.
 *
 * Vapi retires voices periodically. Verify against
 * https://docs.vapi.ai/providers/voice/vapi-voices before adding new ones.
 */

export type VoiceOption = {
  id: string;
  label: string;
  description: string;
};

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "Elliot",
    label: "Elliot",
    description: "Male · warm, professional",
  },
  {
    id: "Kai",
    label: "Kai",
    description: "Male · friendly, relaxed",
  },
  {
    id: "Nico",
    label: "Nico",
    description: "Male · casual, natural",
  },
  {
    id: "Clara",
    label: "Clara",
    description: "Female · warm, professional",
  },
  {
    id: "Emma",
    label: "Emma",
    description: "Female · warm, conversational",
  },
  {
    id: "Savannah",
    label: "Savannah",
    description: "Female · casual, southern",
  },
];

export const DEFAULT_VOICE_ID = "Elliot";

export function isValidVoiceId(id: string): boolean {
  return VOICE_OPTIONS.some((v) => v.id === id);
}
