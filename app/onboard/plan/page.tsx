import { requireStep } from "@/lib/onboarding/draft-business";
import { readPlanCookie } from "@/lib/onboarding/plan-cookie";
import { PlanStepForm } from "@/components/onboarding/plan-step-form";

export default async function PlanStepPage() {
  const session = await requireStep("plan");
  const initialPlan = (await readPlanCookie()) ?? "solo";
  return (
    <PlanStepForm
      businessId={session.business.id}
      initialNumber={session.business.twilioNumber}
      initialPlan={initialPlan}
    />
  );
}
