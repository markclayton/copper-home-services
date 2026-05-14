import { requireStep } from "@/lib/onboarding/draft-business";
import { CalendarStepForm } from "@/components/onboarding/calendar-step-form";

type SearchParams = Promise<{
  gcal_error?: string;
  gcal_connected?: string;
}>;

export default async function CalendarStepPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireStep("calendar");
  const params = await searchParams;
  return (
    <CalendarStepForm
      business={session.business}
      errorParam={params.gcal_error ?? null}
      successParam={params.gcal_connected === "1"}
    />
  );
}
