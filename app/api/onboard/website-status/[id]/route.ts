import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, kbCrawlJobs } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Polled by the onboarding website-step form to track crawl progress.
 * Auth: caller must own the business that owns this job — otherwise
 * anyone could watch any tenant's crawl URL.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const userId = data.claims.sub as string;

  const [row] = await db
    .select({
      job: kbCrawlJobs,
      ownerUserId: businesses.ownerUserId,
    })
    .from(kbCrawlJobs)
    .leftJoin(businesses, eq(businesses.id, kbCrawlJobs.businessId))
    .where(eq(kbCrawlJobs.id, id))
    .limit(1);

  if (!row || row.ownerUserId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: row.job.status,
    rootUrl: row.job.rootUrl,
    pagesScraped: row.job.pagesScraped,
    pagesTotal: row.job.pagesTotal,
    error: row.job.error,
    startedAt: row.job.startedAt,
    completedAt: row.job.completedAt,
  });
}
