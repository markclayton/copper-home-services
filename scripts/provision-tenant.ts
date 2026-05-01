/**
 * Provision a tenant end-to-end. Idempotent — safe to re-run.
 *
 * Run:  npm run provision -- <business_id> [--area-code 415]
 */

import { provisionTenant } from "@/lib/provisioning";

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let areaCode: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--area-code") {
      areaCode = argv[++i];
    } else {
      positional.push(arg);
    }
  }
  return { businessId: positional[0], areaCode };
}

async function main() {
  const { businessId, areaCode } = parseArgs(process.argv.slice(2));

  if (!businessId) {
    console.error("Usage: npm run provision -- <business_id> [--area-code 415]");
    process.exit(1);
  }

  console.log(`Provisioning ${businessId}${areaCode ? ` (area ${areaCode})` : ""}...`);
  const result = await provisionTenant(businessId, { areaCode });

  console.log("\nResult:");
  for (const step of result.steps) {
    const symbol =
      step.status === "ok" ? "✓" : step.status === "skipped" ? "·" : "✗";
    console.log(`  ${symbol} ${step.name}${step.detail ? ` — ${step.detail}` : ""}`);
  }

  if (!result.ok) {
    console.error("\nProvisioning incomplete. Fix the failed step and re-run.");
    process.exit(1);
  }

  console.log("\nDone. Tenant is wired. Flip status to 'live' in the dashboard or DB when ready.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
