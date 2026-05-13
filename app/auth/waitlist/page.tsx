import Link from "next/link";
import { CopperLogo } from "@/components/copper-logo";

export const metadata = {
  title: "Private beta · Copper",
  description: "Copper is in private beta. Email info@joincopper.io to request access.",
};

export default function WaitlistPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md flex flex-col items-center gap-8 text-center">
        <Link href="/" className="block">
          <CopperLogo className="h-14 w-auto" priority />
        </Link>

        <div className="flex flex-col gap-3">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
            Private beta
          </div>
          <h1 className="text-2xl font-semibold leading-tight">
            We&apos;re in private beta while we finish carrier setup.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Copper is in invite-only beta while we complete A2P 10DLC carrier
            registration. Drop us a note and we&apos;ll add you to the next
            wave.
          </p>
        </div>

        <a
          href="mailto:info@joincopper.io?subject=Beta%20access%20request"
          className="inline-flex items-center gap-2 bg-foreground text-background font-medium px-5 py-3 rounded-md hover:opacity-90 transition-opacity"
        >
          Email info@joincopper.io
        </a>

        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
