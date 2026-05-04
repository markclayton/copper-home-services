import { requireStep } from "@/lib/onboarding/draft-business";
import { BusinessStepForm } from "@/components/onboarding/business-step-form";

export default async function BusinessStepPage() {
  const session = await requireStep("business");
  return <BusinessStepForm business={session.business} />;
}
