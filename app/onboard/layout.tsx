import Link from "next/link";
import { CopperLogo } from "@/components/copper-logo";
import { LogoutButton } from "@/components/logout-button";
import { WizardSteps } from "@/components/onboarding/wizard-steps";

export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <CopperLogo className="h-8 w-auto" priority />
            <span className="font-display text-lg tracking-tight">Copper</span>
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
          <WizardSteps />
          {children}
        </div>
      </main>
    </div>
  );
}
