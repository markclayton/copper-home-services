/**
 * Per-tenant gross-margin report. Pulls all live + paused tenants, runs
 * the unit-economics roll-up over a window (defaults to month-to-date),
 * and prints provider cost vs Stripe MRR per tenant.
 *
 * Run:
 *   bun scripts/economics-report.ts                # MTD
 *   bun scripts/economics-report.ts --days=30      # last 30 days
 *   bun scripts/economics-report.ts --business=<id>  # one tenant only
 *
 * Reads via the service role — bypasses RLS — so don't expose this
 * anywhere a tenant can see.
 */

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import {
  getEconomicsRollup,
  startOfMonthUtc,
} from "@/lib/billing/economics-rollup";
import { formatMicroCents } from "@/lib/billing/unit-prices";
import { getStripe } from "@/lib/billing/stripe";

type Args = {
  days?: number;
  businessId?: string;
};

function parseArgs(): Args {
  const out: Args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--days=")) out.days = Number(arg.slice(7));
    else if (arg.startsWith("--business=")) out.businessId = arg.slice(11);
  }
  return out;
}

async function loadMrrMicroCents(
  subscriptionId: string | null,
): Promise<number | null> {
  if (!subscriptionId) return null;
  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    let monthlyCents = 0;
    for (const item of sub.items.data) {
      const price = item.price;
      const amount = price.unit_amount ?? 0;
      const interval = price.recurring?.interval ?? "month";
      const count = price.recurring?.interval_count ?? 1;
      const monthly =
        interval === "year"
          ? amount / (12 * count)
          : interval === "week"
            ? (amount * 52) / (12 * count)
            : interval === "day"
              ? (amount * 365) / (12 * count)
              : amount / count;
      monthlyCents += monthly * (item.quantity ?? 1);
    }
    return monthlyCents * 1_000_000;
  } catch {
    return null;
  }
}

function pad(s: string | number, n: number, align: "l" | "r" = "l"): string {
  const str = String(s);
  if (str.length >= n) return str.slice(0, n);
  return align === "r" ? str.padStart(n) : str.padEnd(n);
}

function printRow(
  name: string,
  voice: number,
  sms: number,
  ai: number,
  emb: number,
  total: number,
  mrr: number | null,
) {
  const marginPart =
    mrr === null
      ? pad("(no sub)", 10, "r")
      : pad(formatMicroCents(mrr - total), 10, "r");
  const marginPctPart =
    mrr === null || mrr === 0
      ? pad("—", 7, "r")
      : pad(`${Math.round(((mrr - total) / mrr) * 100)}%`, 7, "r");

  console.log(
    [
      pad(name, 28),
      pad(formatMicroCents(voice), 10, "r"),
      pad(formatMicroCents(sms), 10, "r"),
      pad(formatMicroCents(ai), 10, "r"),
      pad(formatMicroCents(emb), 10, "r"),
      pad(formatMicroCents(total), 10, "r"),
      pad(mrr === null ? "—" : formatMicroCents(mrr), 10, "r"),
      marginPart,
      marginPctPart,
    ].join("  "),
  );
}

async function main() {
  const args = parseArgs();
  const since = args.days
    ? new Date(Date.now() - args.days * 24 * 60 * 60 * 1000)
    : startOfMonthUtc();

  console.log(
    `Cost report from ${since.toISOString()} → now${args.businessId ? ` (business=${args.businessId})` : ""}`,
  );
  console.log("");
  console.log(
    [
      pad("Tenant", 28),
      pad("Voice", 10, "r"),
      pad("SMS", 10, "r"),
      pad("AI", 10, "r"),
      pad("Embed", 10, "r"),
      pad("Total", 10, "r"),
      pad("MRR", 10, "r"),
      pad("Margin", 10, "r"),
      pad("Margin%", 7, "r"),
    ].join("  "),
  );
  console.log("-".repeat(120));

  const tenants = args.businessId
    ? await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
    : await db
        .select()
        .from(businesses)
        .where(inArray(businesses.status, ["live", "paused"]));

  let grandVoice = 0;
  let grandSms = 0;
  let grandAi = 0;
  let grandEmb = 0;
  let grandTotal = 0;
  let grandMrr = 0;
  let mrrCounted = 0;

  for (const biz of tenants) {
    const [rollup, mrr] = await Promise.all([
      getEconomicsRollup(biz.id, { since }),
      loadMrrMicroCents(biz.stripeSubscriptionId),
    ]);
    const aiTotal = rollup.aiInputMicroCents + rollup.aiOutputMicroCents;
    printRow(
      biz.name || biz.id.slice(0, 8),
      rollup.voiceMicroCents,
      rollup.smsMicroCents,
      aiTotal,
      rollup.embeddingMicroCents,
      rollup.totalMicroCents,
      mrr,
    );
    grandVoice += rollup.voiceMicroCents;
    grandSms += rollup.smsMicroCents;
    grandAi += aiTotal;
    grandEmb += rollup.embeddingMicroCents;
    grandTotal += rollup.totalMicroCents;
    if (mrr !== null) {
      grandMrr += mrr;
      mrrCounted += 1;
    }
  }

  console.log("-".repeat(120));
  printRow(
    `${tenants.length} tenants (${mrrCounted} w/ MRR)`,
    grandVoice,
    grandSms,
    grandAi,
    grandEmb,
    grandTotal,
    grandMrr,
  );

}

void main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    // postgres pool keeps the event loop alive; force exit when we're done.
    process.exit(process.exitCode ?? 0);
  });
