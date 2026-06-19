import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { kbCrawlJobs } from "@/lib/db/schema";
import { requireStep } from "@/lib/onboarding/draft-business";
import { WebsiteStepForm } from "@/components/onboarding/website-step-form";

export default async function WebsiteStepPage() {
  const session = await requireStep("website");

  // Pull the most recent crawl row for this business so a returning user
  // sees the in-progress crawl resume polling instead of starting over.
  const [latest] = await db
    .select()
    .from(kbCrawlJobs)
    .where(eq(kbCrawlJobs.businessId, session.business.id))
    .orderBy(desc(kbCrawlJobs.createdAt))
    .limit(1);

  return (
    <WebsiteStepForm
      businessId={session.business.id}
      initialJob={latest ?? null}
    />
  );
}
