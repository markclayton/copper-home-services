/**
 * Server-side PostHog client. Use for events that originate in route handlers,
 * server actions, webhook handlers, or Inngest jobs — anywhere the browser
 * SDK isn't running.
 *
 *   import { capturePostHog } from "@/lib/observability/posthog";
 *
 *   await capturePostHog({
 *     distinctId: business.ownerUserId,
 *     event: "appointment_booked",
 *     properties: { businessId: business.id, source: "ai" },
 *   });
 *
 * For events fired from a webhook where there's no user, key the event off
 * the businessId so it still groups cleanly per tenant in PostHog. Avoid
 * synthesizing distinct ids that won't match a real signed-in user — that
 * splits the person profile.
 */

import { PostHog } from "posthog-node";
import { env } from "@/lib/env";

let cached: PostHog | null = null;

function getClient(): PostHog | null {
  if (cached) return cached;
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  cached = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Node SDK defaults are tuned for long-running servers. Next.js route
    // handlers are short-lived — flush aggressively so events aren't lost
    // when the function returns.
    flushAt: 1,
    flushInterval: 0,
  });
  return cached;
}

export async function capturePostHog(args: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const client = getClient();
  if (!client) return;
  client.capture({
    distinctId: args.distinctId,
    event: args.event,
    properties: args.properties,
  });
  // Flush eagerly so a serverless function returning before the next event
  // doesn't drop our capture. flushAt:1 above triggers a send; await ensures
  // the network call resolves before we hand control back.
  await client.flush().catch(() => {
    // Swallow — analytics shouldn't fail the user's request.
  });
}

export async function shutdownPostHog(): Promise<void> {
  if (!cached) return;
  await cached.shutdown();
  cached = null;
}
