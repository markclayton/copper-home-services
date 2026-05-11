import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";

/**
 * Returns true if this is the first time we've seen (provider, eventId).
 * Returns false if it's a duplicate — callers should ack 200 and skip work.
 *
 * Uses INSERT ... ON CONFLICT DO NOTHING + RETURNING so the check + record
 * is a single round-trip. No window where two concurrent webhook deliveries
 * could both pass the "is it new?" check.
 */
export async function recordWebhookEvent(
  provider: string,
  eventId: string,
): Promise<boolean> {
  const inserted = await db
    .insert(webhookEvents)
    .values({ provider, eventId })
    .onConflictDoNothing({
      target: [webhookEvents.provider, webhookEvents.eventId],
    })
    .returning({ id: webhookEvents.id });

  return inserted.length > 0;
}
