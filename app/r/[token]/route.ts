import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, reviewRequests } from "@/lib/db/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 8) {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }

  const [row] = await db
    .select({
      id: reviewRequests.id,
      businessId: reviewRequests.businessId,
      googleReviewUrl: businesses.googleReviewUrl,
      businessName: businesses.name,
    })
    .from(reviewRequests)
    .innerJoin(businesses, eq(reviewRequests.businessId, businesses.id))
    .where(eq(reviewRequests.trackingToken, token))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db
    .update(reviewRequests)
    .set({ status: "clicked", clickedAt: new Date() })
    .where(
      and(eq(reviewRequests.id, row.id), isNull(reviewRequests.clickedAt)),
    );

  if (!row.googleReviewUrl) {
    return new NextResponse(
      `Thanks for clicking — ${row.businessName} hasn't set up their review link yet.`,
      { status: 200, headers: { "content-type": "text/plain" } },
    );
  }

  return NextResponse.redirect(row.googleReviewUrl, { status: 302 });
}
