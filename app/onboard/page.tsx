import { redirect } from "next/navigation";
import { loadDraftSession, nextStepPath } from "@/lib/onboarding/draft-business";

export default async function OnboardRootPage() {
  const { business } = await loadDraftSession();
  redirect(nextStepPath(business));
}
