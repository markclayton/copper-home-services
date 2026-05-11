import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function MarketingShell({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string;
  subtitle?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-cream-100 text-ink min-h-screen font-sans antialiased">
      <header className="border-b border-ink/10 bg-cream-100">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 grid place-items-center rounded-md bg-copper text-cream-100 shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]">
              <span className="font-display font-bold text-sm leading-none">
                C
              </span>
            </div>
            <span className="font-display text-xl tracking-tight">Copper</span>
          </Link>
          <Link
            href="/onboard"
            className="inline-flex items-center gap-1.5 bg-ink text-cream-100 text-sm font-medium px-4 py-2 rounded-md hover:bg-copper-700 transition-colors"
          >
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="mb-12 pb-8 border-b border-ink/10">
          <h1 className="font-display text-4xl md:text-5xl leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-ink-700 mt-3 text-lg">{subtitle}</p>
          )}
          {updated && (
            <p className="text-xs text-ink-500 mt-4 font-mono uppercase tracking-wider">
              Last updated · {updated}
            </p>
          )}
        </div>
        <article className="prose prose-ink max-w-none space-y-6 text-ink-700 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:tracking-tight [&_h3]:font-display [&_h3]:text-lg [&_h3]:text-ink [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:text-copper-600 [&_a]:underline hover:[&_a]:text-copper-700 [&_strong]:text-ink">
          {children}
        </article>
      </main>

      <footer className="border-t border-ink/10 bg-cream-100">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-500">
          <div>© {new Date().getFullYear()} Copper. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-ink">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
