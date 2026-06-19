import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  businesses,
  callTranscriptSegments,
  calls,
} from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Live transcript polling endpoint. The call detail page hits this every
 * ~1.5s while status='in_progress' and stops once status flips to a
 * terminal value.
 *
 * Query param: `since` — ISO timestamp; only segments with createdAt
 * strictly greater than this are returned. Lets the client request the
 * delta instead of refetching the whole transcript every tick.
 */
export async function GET(
  req: NextRequest,
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

  // One join: pull the call + its business owner so we can authz and
  // return status in a single round trip.
  const [row] = await db
    .select({
      call: calls,
      ownerUserId: businesses.ownerUserId,
    })
    .from(calls)
    .leftJoin(businesses, eq(businesses.id, calls.businessId))
    .where(eq(calls.id, id))
    .limit(1);
  if (!row || row.ownerUserId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const sinceRaw = req.nextUrl.searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : null;
  const whereClauses = since && !Number.isNaN(since.getTime())
    ? and(
        eq(callTranscriptSegments.callId, id),
        gt(callTranscriptSegments.createdAt, since),
      )
    : eq(callTranscriptSegments.callId, id);

  const segments = await db
    .select({
      id: callTranscriptSegments.id,
      role: callTranscriptSegments.role,
      text: callTranscriptSegments.text,
      timeOffsetMs: callTranscriptSegments.timeOffsetMs,
      createdAt: callTranscriptSegments.createdAt,
    })
    .from(callTranscriptSegments)
    .where(whereClauses)
    .orderBy(asc(callTranscriptSegments.timeOffsetMs))
    .limit(500);

  return NextResponse.json({
    status: row.call.status,
    segments,
  });
}
