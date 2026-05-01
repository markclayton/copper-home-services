import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NoBusinessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Account not yet linked</CardTitle>
          <CardDescription>
            Your sign-in works, but your account isn&apos;t connected to a business yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This usually means your white-glove onboarding is still in progress.
          Reach out to your operator or check your email for a setup link.
        </CardContent>
      </Card>
    </div>
  );
}
