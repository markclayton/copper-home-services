import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_URL: z.string().url().default("http://localhost:3000"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  DATABASE_URL: z.string().url(),
  // Optional separate connection string for migrations. Use Supabase's
  // "Direct connection" or "Session pooler" string here, since drizzle-kit
  // needs prepared statements which the transaction pooler strips. Falls
  // back to DATABASE_URL when unset.
  DIRECT_URL: z.string().url().optional(),

  INTERNAL_WEBHOOK_SECRET: z.string().min(16).optional(),

  // Private-beta gate. Comma-separated list of emails allowed to create new
  // accounts. When unset, gate is OFF (anyone can sign up). When set, only
  // listed emails can sign up via email/password or Google OAuth. Existing
  // users (any email already tied to a business in our DB) always get
  // through. Used to keep production tight while A2P 10DLC is pending.
  SIGNUP_ALLOWLIST: z.string().optional(),

  VAPI_API_KEY: z.string().min(1).optional(),
  VAPI_ORG_ID: z.string().min(1).optional(),
  VAPI_ASSISTANT_TEMPLATE_ID: z.string().min(1).optional(),
  VAPI_WEBHOOK_SECRET: z.string().min(1).optional(),

  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_DEFAULT_FROM_NUMBER: z.string().min(1).optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().min(1).optional(),
  SMS_MONTHLY_CAP_PER_BUSINESS: z.coerce.number().int().positive().optional(),

  // Demo mode: when both are set, provisionTenant reuses these for every new
  // tenant instead of buying a fresh Twilio number + registering with Vapi.
  // Each tenant still gets a unique Vapi assistant + Cal.com event type, but
  // the phone number is shared (last signup's assistant wins on inbound).
  DEMO_TWILIO_NUMBER: z.string().min(1).optional(),
  DEMO_VAPI_PHONE_NUMBER_ID: z.string().min(1).optional(),

  OPENROUTER_API_KEY: z.string().min(1).optional(),

  // Calendar integration (Google now, Microsoft later). The client ID +
  // secret come from a GCP OAuth client with the Calendar API enabled. The
  // token key encrypts refresh/access tokens at rest — generate with
  // `openssl rand -hex 32`.
  GOOGLE_CALENDAR_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().min(1).optional(),
  CALENDAR_TOKEN_KEY: z.string().min(1).optional(),



  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_SETUP: z.string().min(1).optional(),
  STRIPE_PRICE_MRR: z.string().min(1).optional(),

  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),

  RESEND_API_KEY: z.string().min(1).optional(),
  NOTIFICATIONS_EMAIL_FROM: z.string().min(1).optional(),

  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function loadEnv(): Env {
  if (cached) return cached;

  // Treat empty strings ("VAPI_API_KEY=") as unset — otherwise optional-with-min
  // schemas reject them.
  const cleaned: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) {
    cleaned[k] = v === "" ? undefined : v;
  }

  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  // Cross-field production guards. These can't be expressed in the Zod
  // schema because they depend on NODE_ENV.
  if (parsed.data.NODE_ENV === "production") {
    const failures: string[] = [];
    if (parsed.data.DEMO_TWILIO_NUMBER || parsed.data.DEMO_VAPI_PHONE_NUMBER_ID) {
      failures.push(
        "DEMO_TWILIO_NUMBER / DEMO_VAPI_PHONE_NUMBER_ID must be unset in production — these route every new signup to a shared demo number.",
      );
    }
    if (!parsed.data.VAPI_WEBHOOK_SECRET) {
      failures.push(
        "VAPI_WEBHOOK_SECRET must be set in production — without it, any caller can POST fake end-of-call reports for any tenant.",
      );
    }
    if (!parsed.data.INTERNAL_WEBHOOK_SECRET) {
      failures.push(
        "INTERNAL_WEBHOOK_SECRET must be set in production — the lead webhook is unauthenticated without it.",
      );
    }
    if (
      (parsed.data.GOOGLE_CALENDAR_CLIENT_ID ||
        parsed.data.GOOGLE_CALENDAR_CLIENT_SECRET) &&
      !parsed.data.CALENDAR_TOKEN_KEY
    ) {
      failures.push(
        "CALENDAR_TOKEN_KEY must be set when Google Calendar OAuth is configured — refresh tokens are stored encrypted with this key.",
      );
    }
    if (failures.length > 0) {
      throw new Error(
        `Invalid production environment:\n${failures.map((f) => `  - ${f}`).join("\n")}`,
      );
    }
  }

  cached = parsed.data;
  return cached;
}

/**
 * Lazy proxy. Validation runs on first property access, not at import time —
 * so route modules can be statically imported during `next build` without a
 * configured `.env.local`.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return loadEnv()[prop as keyof Env];
  },
  has(_target, prop) {
    return prop in loadEnv();
  },
  ownKeys() {
    return Object.keys(loadEnv());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return {
      enumerable: true,
      configurable: true,
      value: loadEnv()[prop as keyof Env],
    };
  },
});

export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = loadEnv()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `Required env var ${String(key)} is not set. This integration is not yet configured.`,
    );
  }
  return value as NonNullable<Env[K]>;
}
