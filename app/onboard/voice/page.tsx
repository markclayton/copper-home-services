import { requireStep } from "@/lib/onboarding/draft-business";
import { VoiceStepForm } from "@/components/onboarding/voice-step-form";

export default async function VoiceStepPage() {
  const session = await requireStep("voice");
  return <VoiceStepForm kb={session.kb} />;
}
