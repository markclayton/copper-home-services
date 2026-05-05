import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SetupStatusPoller } from "@/components/onboarding/setup-status-poller";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Invalid setup link.</p>
      </main>
    );
  }

  const [business] = await db
    .select({ id: businesses.id, name: businesses.name, status: businesses.status })
    .from(businesses)
    .where(eq(businesses.id, id))
    .limit(1);

  if (!business) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Setup record not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Almost there</CardTitle>
          <CardDescription>
            We&apos;re finishing setup for {business.name}. This usually takes
            a few seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetupStatusPoller
            businessId={business.id}
            initialStatus={business.status}
          />
        </CardContent>
      </Card>
    </main>
  );
}
