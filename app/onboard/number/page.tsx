import { requireStep } from "@/lib/onboarding/draft-business";
import { extractUsAreaCode } from "@/lib/format";
import { NumberStepForm } from "@/components/onboarding/number-step-form";

export default async function NumberStepPage() {
  const session = await requireStep("number");
  const defaultAreaCode =
    extractUsAreaCode(session.business.ownerPhone) ?? "";
  return (
    <NumberStepForm
      business={session.business}
      defaultAreaCode={defaultAreaCode}
    />
  );
}
