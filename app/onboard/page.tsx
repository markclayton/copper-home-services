import Link from "next/link";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default function OnboardPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-4xl mx-auto p-4 flex justify-between items-center">
          <Link href="/" className="font-semibold">
            Copper
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>
      <section className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Onboard your business</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Tell us about your business. An operator reviews every submission
            before going live — typically within 24 hours.
          </p>
        </div>
        <OnboardingForm />
      </section>
    </main>
  );
}
