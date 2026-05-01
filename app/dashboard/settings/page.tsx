import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { knowledgeBase } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/db/queries";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage() {
  const { business } = await requireBusiness();

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
    </div>
  );
}
