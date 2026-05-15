import { NextResponse, type NextRequest } from "next/server";
import { isSelfServePlan, setPlanCookie } from "@/lib/onboarding/plan-cookie";

/**
 * Entry point from the landing pricing CTAs. Sets the plan-choice cookie
 * and redirects to signup. GET so the pricing card can be a plain <a>.
 */
export async function GET(req: NextRequest) {
  const planParam = req.nextUrl.searchParams.get("plan");
  if (isSelfServePlan(planParam)) {
    await setPlanCookie(planParam);
  }
  return NextResponse.redirect(new URL("/auth/sign-up", req.url));
}
