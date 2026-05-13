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
import { knowledgeBase } from "@/lib/db/schema";

/**
 * Dashboard nudge for new tenants who skipped Services/FAQs during
 * onboarding. Auto-hides once both are filled in — there's no dismiss
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

  const services = Array.isArray(kb?.services) ? kb.services : [];
  const faqs = Array.isArray(kb?.faqs) ? kb.faqs : [];

  const hasServices = services.length > 0;
  const hasFaqs = faqs.length > 0;

  if (hasServices && hasFaqs) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">Finish setting up your AI</CardTitle>
        <CardDescription>
          Your AI works best when it knows what you offer and the questions
          customers ask. Without these, it can&apos;t quote prices or answer
          common questions — it just escalates everything to you.
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
