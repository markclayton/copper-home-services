/**
 * Audit + release stale Twilio numbers on the platform account.
 *
 * Lists every IncomingPhoneNumber Twilio is billing you for, cross-
 * references against the businesses table, and classifies each one:
 *
 *   live      — owned by a business with status="live". NEVER touched.
 *   pending   — owned by a business with status="pending". Probably an
 *               abandoned signup; safe to release if older than a day.
 *   demo      — matches DEMO_TWILIO_NUMBER. Skipped (shared resource).
 *   orphan    — no matching business row in the DB at all. The DB was
 *               deleted but the number wasn't released — release.
 *
 * Run:
 *   bun scripts/twilio-cleanup.ts                  # dry-run, lists only
 *   bun scripts/twilio-cleanup.ts --release        # release orphans + abandoned-pending
 *   bun scripts/twilio-cleanup.ts --release --include-pending=false
 *                                                  # only release orphans
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { getTwilioClient } from "@/lib/telephony/twilio";
import { env } from "@/lib/env";

type Classification = "live" | "pending" | "demo" | "orphan";

type Row = {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  classification: Classification;
  businessId: string | null;
  businessName: string | null;
  ageDays: number;
  dateCreated: Date;
};

function parseArgs(argv: string[]) {
  let release = false;
  let includePending = true; // also release pending-but-older-than-24h
  let pendingMinAgeDays = 1;
  for (const arg of argv) {
    if (arg === "--release") release = true;
    else if (arg === "--include-pending=false") includePending = false;
    else if (arg.startsWith("--min-pending-age=")) {
      pendingMinAgeDays = Number(arg.split("=")[1]);
    }
  }
  return { release, includePending, pendingMinAgeDays };
}

async function classify(): Promise<Row[]> {
  const client = getTwilioClient();
  const numbers = await client.incomingPhoneNumbers.list({ limit: 200 });

  const rows: Row[] = [];
  const now = Date.now();

  for (const n of numbers) {
    const created = n.dateCreated ?? new Date();
    const ageDays = (now - created.getTime()) / (1000 * 60 * 60 * 24);

    let classification: Classification = "orphan";
    let businessId: string | null = null;
    let businessName: string | null = null;

    if (env.DEMO_TWILIO_NUMBER && n.phoneNumber === env.DEMO_TWILIO_NUMBER) {
      classification = "demo";
    } else {
      const [biz] = await db
        .select({
          id: businesses.id,
          name: businesses.name,
          status: businesses.status,
        })
        .from(businesses)
        .where(eq(businesses.twilioNumber, n.phoneNumber))
        .limit(1);

      if (biz) {
        businessId = biz.id;
        businessName = biz.name;
        classification = biz.status === "live" ? "live" : "pending";
      }
    }

    rows.push({
      sid: n.sid,
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      classification,
      businessId,
      businessName,
      ageDays,
      dateCreated: created,
    });
  }

  return rows;
}

function symbol(c: Classification): string {
  switch (c) {
    case "live":
      return "🟢";
    case "pending":
      return "🟡";
    case "demo":
      return "🔵";
    case "orphan":
      return "🔴";
  }
}

function fmtPhone(p: string): string {
  const d = p.replace(/[^0-9]/g, "");
  if (d.length === 11 && d.startsWith("1")) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return p;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log("Auditing Twilio numbers...");
  const rows = await classify();

  if (rows.length === 0) {
    console.log("No numbers on the account.");
    return;
  }

  const groups = {
    live: rows.filter((r) => r.classification === "live"),
    pending: rows.filter((r) => r.classification === "pending"),
    demo: rows.filter((r) => r.classification === "demo"),
    orphan: rows.filter((r) => r.classification === "orphan"),
  };

  console.log(`\n${rows.length} number(s) on this Twilio account:\n`);
  for (const r of rows) {
    const tags = [
      r.businessName ? `→ ${r.businessName}` : null,
      `${Math.floor(r.ageDays)}d old`,
    ]
      .filter(Boolean)
      .join("  ");
    console.log(
      `  ${symbol(r.classification)} ${fmtPhone(r.phoneNumber).padEnd(16)}  ${r.classification.padEnd(7)}  ${tags}`,
    );
  }

  console.log("");
  console.log(`Summary:`);
  console.log(`  🟢 live:    ${groups.live.length}`);
  console.log(`  🟡 pending: ${groups.pending.length}`);
  console.log(`  🔵 demo:    ${groups.demo.length}`);
  console.log(`  🔴 orphan:  ${groups.orphan.length}`);

  const orphansToRelease = groups.orphan;
  const pendingToRelease = opts.includePending
    ? groups.pending.filter((r) => r.ageDays >= opts.pendingMinAgeDays)
    : [];
  const releaseTargets = [...orphansToRelease, ...pendingToRelease];

  console.log("");
  if (releaseTargets.length === 0) {
    console.log("Nothing to release.");
    return;
  }
  console.log(`Eligible to release: ${releaseTargets.length}`);
  console.log(`  • ${orphansToRelease.length} orphan(s)`);
  if (opts.includePending) {
    console.log(
      `  • ${pendingToRelease.length} pending older than ${opts.pendingMinAgeDays}d`,
    );
  }

  if (!opts.release) {
    console.log(
      "\nDry-run mode. Re-run with --release to actually release these numbers.",
    );
    if (opts.includePending) {
      console.log(
        "Pass --include-pending=false to only release orphans, keep pending.",
      );
    }
    return;
  }

  console.log("\nReleasing...");
  const client = getTwilioClient();
  let ok = 0;
  let failed = 0;
  for (const r of releaseTargets) {
    try {
      await client.incomingPhoneNumbers(r.sid).remove();
      console.log(`  ✓ released ${fmtPhone(r.phoneNumber)} (${r.sid})`);
      ok += 1;
      // If a pending business owned it, clear the DB columns so a future
      // re-run doesn't try to release a number Twilio doesn't have anymore.
      if (r.businessId) {
        await db
          .update(businesses)
          .set({
            twilioNumber: null,
            twilioSubaccountSid: null,
            updatedAt: new Date(),
          })
          .where(eq(businesses.id, r.businessId));
      }
    } catch (err) {
      console.log(
        `  ✗ failed ${fmtPhone(r.phoneNumber)}: ${err instanceof Error ? err.message : String(err)}`,
      );
      failed += 1;
    }
  }

  console.log(`\nDone. ${ok} released, ${failed} failed.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
