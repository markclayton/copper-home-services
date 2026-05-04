import { requireStep } from "@/lib/onboarding/draft-business";
import { PlanStepForm } from "@/components/onboarding/plan-step-form";

export default async function PlanStepPage() {
  const session = await requireStep("plan");
  return (
    <PlanStepForm
      businessId={session.business.id}
      initialNumber={session.business.twilioNumber}
    />
  );
}
