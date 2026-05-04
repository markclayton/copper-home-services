import { requireStep } from "@/lib/onboarding/draft-business";
import { ServicesStepForm } from "@/components/onboarding/services-step-form";

export default async function ServicesStepPage() {
  const session = await requireStep("services");
  return <ServicesStepForm kb={session.kb} />;
}
