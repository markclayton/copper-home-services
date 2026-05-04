import { requireStep } from "@/lib/onboarding/draft-business";
import { HoursStepForm } from "@/components/onboarding/hours-step-form";

export default async function HoursStepPage() {
  const session = await requireStep("hours");
  return <HoursStepForm business={session.business} />;
}
