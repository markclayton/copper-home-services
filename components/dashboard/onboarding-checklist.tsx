import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { businesses, knowledgeBase } from "@/lib/db/schema";

/**
 * Dashboard nudge for new tenants who skipped Services/FAQs/Calendar during
 * onboarding. Auto-hides once all three are done — there's no dismiss
 * button by design: the AI noticeably underperforms without these, so we
 * keep nudging until the owner gets the message.
 */
export async function OnboardingChecklist({
  businessId,
}: {
  businessId: string;
}) {
  const [kb] = await db
    .select({ services: knowledgeBase.services, faqs: knowledgeBase.faqs })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.businessId, businessId))
    .limit(1);

  const [biz] = await db
    .select({
      calendarProvider: businesses.calendarProvider,
      googleReviewUrl: businesses.googleReviewUrl,
      reviewRequestsEnabled: businesses.reviewRequestsEnabled,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const services = Array.isArray(kb?.services) ? kb.services : [];
  const faqs = Array.isArray(kb?.faqs) ? kb.faqs : [];

  const hasServices = services.length > 0;
  const hasFaqs = faqs.length > 0;
  const hasCalendar = !!biz?.calendarProvider;
  // Reviews task is "done" when either the URL is set OR the owner has
  // explicitly opted out — both are valid finished states.
  const hasReviewSetup =
    !!biz?.googleReviewUrl || biz?.reviewRequestsEnabled === false;

  if (hasServices && hasFaqs && hasCalendar && hasReviewSetup) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">Finish setting up your AI</CardTitle>
        <CardDescription>
          Your AI works best when it knows what you offer, the questions
          customers ask, and your real availability. Without these, it
          can&apos;t quote, answer common questions, or book.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1.5">
          <ChecklistItem
            done={hasServices}
            label="Add your services"
            hint="What you do and rough pricing. The AI only quotes what's here."
          />
          <ChecklistItem
            done={hasFaqs}
            label="Add FAQs"
            hint="Common questions you get asked. Saves you from being interrupted."
          />
          <ChecklistItem
            done={hasCalendar}
            label="Connect your calendar"
            hint="Without this the AI can't see your schedule or book appointments."
          />
          <ChecklistItem
            done={hasReviewSetup}
            label="Set up Google reviews"
            hint="Paste your Google review link so the AI can auto-ask customers — or turn the feature off in Settings."
          />
        </ul>
        <div>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Finish setup in Settings <ArrowRight size={14} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}


function ChecklistItem({
  done,
  label,
  hint,
}: {
  done: boolean;
  label: string;
  hint: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      {done ? (
        <CheckCircle2
          size={16}
          className="text-primary shrink-0 mt-0.5"
          strokeWidth={2.5}
        />
      ) : (
        <Circle
          size={16}
          className="text-muted-foreground shrink-0 mt-0.5"
        />
      )}
      <div className="flex flex-col">
        <span
          className={`text-sm font-medium ${
            done ? "text-muted-foreground line-through" : ""
          }`}
        >
          {label}
        </span>
        {!done && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
    </li>
  );
}
