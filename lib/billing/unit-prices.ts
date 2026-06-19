/**
 * Provider unit prices in micro-cents (1e-6 USD) so token-level rates
 * like $3 per 1M tokens (= 0.0003¢/token = 300 µ¢/token) stay lossless
 * in our integer-math accounting.
 *
 * Defaults reflect public list pricing as of model launch. Override via
 * env when contracts shift or vendors change list:
 *   COPPER_PRICE_VAPI_PER_MINUTE_MICROCENTS
 *   COPPER_PRICE_TWILIO_SMS_PER_SEGMENT_MICROCENTS
 *   COPPER_PRICE_ANTHROPIC_SONNET_INPUT_PER_TOKEN_MICROCENTS
 *   COPPER_PRICE_ANTHROPIC_SONNET_OUTPUT_PER_TOKEN_MICROCENTS
 *   COPPER_PRICE_ANTHROPIC_HAIKU_INPUT_PER_TOKEN_MICROCENTS
 *   COPPER_PRICE_ANTHROPIC_HAIKU_OUTPUT_PER_TOKEN_MICROCENTS
 *   COPPER_PRICE_OPENAI_EMBEDDING_PER_TOKEN_MICROCENTS
 *
 * One cent = 1_000_000 µ¢. One dollar = 100_000_000 µ¢.
 */

import { env } from "@/lib/env";

const DEFAULTS = {
  // Vapi blends model + voice + transcription minutes; ~5¢/min is the
  // current platform-wide rate-of-thumb. Tune via env per-org.
  vapiPerMinute: 5_000_000,
  // Twilio SMS US outbound is ~0.79¢ per segment list.
  twilioSmsPerSegment: 7_900,
  // Anthropic Claude Sonnet 4.6: $3 / $15 per 1M tokens.
  anthropicSonnetInputPerToken: 300,
  anthropicSonnetOutputPerToken: 1_500,
  // Anthropic Claude Haiku 4.5: $1 / $5 per 1M tokens.
  anthropicHaikuInputPerToken: 100,
  anthropicHaikuOutputPerToken: 500,
  // OpenAI text-embedding-3-small: $0.02 / 1M tokens.
  openaiEmbeddingPerToken: 2,
} as const;

function envNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/**
 * Resolved per-token / per-unit prices in micro-cents. Read once at
 * first access; env changes need a process restart to take effect.
 */
export function unitPrices() {
  const e = env;
  return {
    vapiPerMinute: envNumber(
      e.COPPER_PRICE_VAPI_PER_MINUTE_MICROCENTS,
      DEFAULTS.vapiPerMinute,
    ),
    twilioSmsPerSegment: envNumber(
      e.COPPER_PRICE_TWILIO_SMS_PER_SEGMENT_MICROCENTS,
      DEFAULTS.twilioSmsPerSegment,
    ),
    anthropicSonnetInputPerToken: envNumber(
      e.COPPER_PRICE_ANTHROPIC_SONNET_INPUT_PER_TOKEN_MICROCENTS,
      DEFAULTS.anthropicSonnetInputPerToken,
    ),
    anthropicSonnetOutputPerToken: envNumber(
      e.COPPER_PRICE_ANTHROPIC_SONNET_OUTPUT_PER_TOKEN_MICROCENTS,
      DEFAULTS.anthropicSonnetOutputPerToken,
    ),
    anthropicHaikuInputPerToken: envNumber(
      e.COPPER_PRICE_ANTHROPIC_HAIKU_INPUT_PER_TOKEN_MICROCENTS,
      DEFAULTS.anthropicHaikuInputPerToken,
    ),
    anthropicHaikuOutputPerToken: envNumber(
      e.COPPER_PRICE_ANTHROPIC_HAIKU_OUTPUT_PER_TOKEN_MICROCENTS,
      DEFAULTS.anthropicHaikuOutputPerToken,
    ),
    openaiEmbeddingPerToken: envNumber(
      e.COPPER_PRICE_OPENAI_EMBEDDING_PER_TOKEN_MICROCENTS,
      DEFAULTS.openaiEmbeddingPerToken,
    ),
  };
}

export type AnthropicModelFamily = "sonnet" | "haiku";

/**
 * Pick the per-token rates for a model id. We pattern-match the model
 * string because the api returns the slug we asked for and the slug
 * encodes the family. Unknown models default to Sonnet rates so we
 * over-attribute rather than under-attribute cost.
 */
export function anthropicFamily(model: string): AnthropicModelFamily {
  return /haiku/i.test(model) ? "haiku" : "sonnet";
}

/** Format micro-cents as a human-readable USD string. */
export function formatMicroCents(microCents: number): string {
  const dollars = microCents / 1_000_000 / 100;
  if (Math.abs(dollars) >= 1) return `$${dollars.toFixed(2)}`;
  if (Math.abs(dollars) >= 0.01) return `$${dollars.toFixed(3)}`;
  return `$${dollars.toFixed(5)}`;
}
