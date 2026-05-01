import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ThanksPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Thanks — we&apos;ve got it.</CardTitle>
          <CardDescription>
            Your submission is in. An operator will review and reach out within
            one business day to walk you through the final setup steps.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            You&apos;ll get an email at the address you provided when your AI
            assistant is live.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
