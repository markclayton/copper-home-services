"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, kbCrawlJobs } from "@/lib/db/schema";
import { inngest } from "@/lib/jobs/client";
import {
  advanceStepIfAt,
  loadDraftSession,
  pathAfterSavingStep,
} from "@/lib/onboarding/draft-business";
import { trackOnboardingStepCompleted } from "@/lib/observability/events";

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Paste your website URL")
    .transform((v, ctx) => {
      let normalized = v;
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
      }
      try {
        const url = new URL(normalized);
        if (!url.hostname.includes(".")) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "That doesn't look like a real URL.",
          });
          return z.NEVER;
        }
        return url.toString();
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "That doesn't look like a real URL.",
        });
        return z.NEVER;
      }
    }),
});

export type WebsiteStepState = {
  ok: boolean;
  error?: string;
  crawlJobId?: string;
};

/**
 * Kick off a website crawl. Returns the new crawl job id; the form polls
 * /api/onboard/website-status to track progress. The owner doesn't advance
 * the wizard from this action — they advance manually once the crawl is
 * ready (or by clicking "Skip & add manually").
 */
export async function startCrawl(
  _prev: WebsiteStepState,
  form: FormData,
): Promise<WebsiteStepState> {
  const { business } = await loadDraftSession();

  const parsed = schema.safeParse({ url: form.get("url") });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const [job] = await db
    .insert(kbCrawlJobs)
    .values({
      businessId: business.id,
      rootUrl: parsed.data.url,
      status: "queued",
    })
    .returning({ id: kbCrawlJobs.id });

  await inngest.send({
    name: "kb/crawl-requested",
    data: {
      businessId: business.id,
      crawlJobId: job.id,
      rootUrl: parsed.data.url,
      autoExtract: true,
    },
  });

  return { ok: true, crawlJobId: job.id };
}

/**
 * Advance past the website step. Used both by the auto-redirect after
 * a successful crawl and by the explicit "Skip & add manually" link.
 */
export async function completeWebsiteStep(): Promise<void> {
  const { business, userId } = await loadDraftSession();
  const redirectPath = pathAfterSavingStep(business, "website");

  await db
    .update(businesses)
    .set({
      onboardingStep: advanceStepIfAt(business.onboardingStep, "website"),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id));

  await trackOnboardingStepCompleted({
    userId,
    businessId: business.id,
    step: "website",
  });

  redirect(redirectPath);
}
