import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { hasEnvVars } from "@/lib/utils";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center p-4">
          <Link href="/" className="font-semibold">
            Copper
          </Link>
          {hasEnvVars ? (
            <Suspense>
              <AuthButton />
            </Suspense>
          ) : (
            <EnvVarWarning />
          )}
        </div>
      </nav>

      <section className="flex-1 max-w-3xl mx-auto px-6 py-24 flex flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight">
          AI receptionist for owner-operated home services.
        </h1>
        <p className="text-lg text-muted-foreground">
          Stop missing calls. Stop forgetting review requests. Stop losing
          leads to slow response. Copper picks up, qualifies, books, and texts
          back — 24/7, in under two hours of setup.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-6">
        <span>Copper Home Services</span>
        <ThemeSwitcher />
      </footer>
    </main>
  );
}
