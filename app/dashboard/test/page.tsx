import { requireBusiness } from "@/lib/db/queries";
import { TestCallWidget } from "@/components/dashboard/test-call-widget";
import { env } from "@/lib/env";

export default async function TestCallPage() {
  const { business } = await requireBusiness();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Try it</h1>
        <p className="text-sm text-muted-foreground">
          Talk to your AI receptionist right in the browser. Useful for
          checking how it sounds and shaking out edge cases after you change
          the script or services.
        </p>
      </div>
      <TestCallWidget
        assistantId={business.vapiAssistantId}
        publicKey={env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? null}
        assistantName={`${business.name} Receptionist`}
      />
    </div>
  );
}
