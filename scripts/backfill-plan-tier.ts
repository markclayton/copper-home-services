/**
 * One-off: stamp planTier on existing businesses by reading metadata.plan
 * off their live Stripe subscription. Pre-cutover tenants land in the DB
 * with planTier=default; this catches them up so usage alerts and any
 * future tier-gated features work.
 *
 *   bun scripts/backfill-plan-tier.ts          # dry run, prints what would change
 *   bun scripts/backfill-plan-tier.ts --apply  # actually writes the updates
 */

import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { getStripe } from "@/lib/billing/stripe";
import { tierFromStripeMetadata, type PlanTier } from "@/lib/billing/plans";

const APPLY = process.argv.includes("--apply");

async function main() {
  const stripe = getStripe();

  const rows = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      planTier: businesses.planTier,
      stripeSubscriptionId: businesses.stripeSubscriptionId,
    })
    .from(businesses)
    .where(isNotNull(businesses.stripeSubscriptionId));

  console.log(
    `Found ${rows.length} business(es) with a Stripe subscription.\n`,
  );

  let updates = 0;
  let skipped = 0;
  let missingMeta = 0;

  for (const row of rows) {
    if (!row.stripeSubscriptionId) continue;

    let sub;
    try {
      sub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
    } catch (err) {
      console.log(
        `  [${row.name}] ✗ stripe retrieve failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }

    const metaPlan = sub.metadata?.plan;
    if (!metaPlan) {
      console.log(
        `  [${row.name}] — no metadata.plan on sub ${row.stripeSubscriptionId}, leaving as ${row.planTier}`,
      );
      missingMeta++;
      continue;
    }

    const nextTier: PlanTier = tierFromStripeMetadata(metaPlan);
    if (nextTier === row.planTier) {
      console.log(`  [${row.name}] = already ${nextTier}, skipping`);
      skipped++;
      continue;
    }

    console.log(
      `  [${row.name}] → ${row.planTier} → ${nextTier} (sub ${row.stripeSubscriptionId})`,
    );

    if (APPLY) {
      await db
        .update(businesses)
        .set({ planTier: nextTier, updatedAt: new Date() })
        .where(eq(businesses.id, row.id));
    }
    updates++;
  }

  console.log(
    `\nSummary: ${updates} ${APPLY ? "updated" : "to update"}, ${skipped} unchanged, ${missingMeta} missing metadata.`,
  );
  if (!APPLY && updates > 0) {
    console.log(`Re-run with --apply to commit.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
