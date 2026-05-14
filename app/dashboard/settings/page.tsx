import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { knowledgeBase } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/db/queries";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { DangerZone } from "@/components/dashboard/danger-zone";
import { IntegrationsCard } from "@/components/dashboard/integrations-card";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gcal_error?: string; gcal_connected?: string }>;
}) {
  const { business } = await requireBusiness();
  const params = await searchParams;

  const [kb] = await db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.businessId, business.id))
    .limit(1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Edit your business info and the knowledge the AI uses on every call.
          Save redeploys the assistant automatically.
        </p>
      </div>
      <SettingsForm business={business} kb={kb ?? null} />
      <IntegrationsCard
        status={{
          provider: business.calendarProvider,
          accountEmail: business.calendarAccountEmail,
          connectedAt: business.calendarConnectedAt,
        }}
        errorParam={params.gcal_error ?? null}
        successParam={params.gcal_connected === "1"}
      />
      <DangerZone businessName={business.name} />
    </div>
  );
}
