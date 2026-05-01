import Link from "next/link";
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
import { Button } from "@/components/ui/button";
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
          <CardTitle>Setting up {business.name}</CardTitle>
          <CardDescription>
            We&apos;re wiring up your phone number and AI assistant. This usually
            takes 30–60 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SetupStatusPoller
            businessId={business.id}
            initialStatus={business.status}
          />
          <p className="text-xs text-muted-foreground">
            Once setup completes, we&apos;ll email you a sign-in link. You can
            also{" "}
            <Link href="/auth/login" className="underline">
              sign in here
            </Link>{" "}
            after the email arrives.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
