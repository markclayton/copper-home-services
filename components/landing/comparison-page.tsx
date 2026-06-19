/**
 * Comparison page template (Copper vs {Competitor}) used by /vs/[slug].
 * Reuses the shared SiteHeader and SiteFooter from the main landing for
 * brand continuity. Comparison body is purely server-rendered — no
 * client JS needed for table, cards, or FAQ details.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  CTAButton,
  FinalCta,
  SiteFooter,
  SiteHeader,
} from "./landing-page";
import type { Competitor } from "@/lib/competitors";

export function ComparisonPage({
  competitor,
  isAuthed,
}: {
  competitor: Competitor;
  isAuthed: boolean;
}) {
  return (
    <div className="bg-cream-100 text-ink min-h-screen font-sans antialiased selection:bg-copper/20">
      <SiteHeader isAuthed={isAuthed} />
      <ComparisonHero competitor={competitor} isAuthed={isAuthed} />
      <SummaryCards competitor={competitor} />
      <FeatureTable competitor={competitor} />
      <WhenToChoose competitor={competitor} />
      <ComparisonFaq competitor={competitor} />
      <FinalCta isAuthed={isAuthed} />
      <SiteFooter />
    </div>
  );
}

function ComparisonHero({
  competitor,
  isAuthed,
}: {
  competitor: Competitor;
  isAuthed: boolean;
}) {
  return (
    <section className="border-b border-ink/10">
      <div className="mx-auto max-w-4xl px-6 pt-16 pb-12 md:pt-20 md:pb-14">
        <div className="text-xs uppercase tracking-[0.18em] text-copper-600 font-medium mb-4">
          Compare
        </div>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
          Copper <span className="text-ink/40 font-light italic">vs</span>{" "}
          <span className="text-copper-600 italic font-light">
            {competitor.name}
          </span>
        </h1>
        <p className="mt-6 text-lg text-ink-700 max-w-2xl leading-relaxed">
          {competitor.summary}
        </p>
        <div className="mt-8 flex flex-wrap gap-3 items-center">
          <CTAButton
            href={isAuthed ? "/dashboard" : "/auth/sign-up"}
            label={
              isAuthed ? "Open your dashboard" : "Try Copper free for 7 days"
            }
            prominent
          />
          <a
            href={competitor.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink px-3 py-2"
          >
            Visit {competitor.name}
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

function SummaryCards({ competitor }: { competitor: Competitor }) {
  return (
    <section className="border-b border-ink/10">
      <div className="mx-auto max-w-4xl px-6 py-14 md:py-20 grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-ink/15 bg-cream-50 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-ink-500 font-medium mb-3">
            What {competitor.name} does well
          </div>
          <ul className="space-y-2.5 text-sm text-ink-800 leading-relaxed">
            {competitor.strengths.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="text-copper-600 mt-0.5">·</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-copper-300 bg-copper-50/50 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-copper-700 font-medium mb-3">
            Where Copper is different
          </div>
          <ul className="space-y-2.5 text-sm text-ink-800 leading-relaxed">
            {competitor.copperDifferentiators.map((d, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="text-copper-600 mt-0.5">·</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FeatureTable({ competitor }: { competitor: Competitor }) {
  return (
    <section className="border-b border-ink/10">
      <div className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <div className="text-xs uppercase tracking-[0.18em] text-copper-600 font-medium mb-3">
          Side by side
        </div>
        <h2 className="font-display text-3xl md:text-4xl leading-tight tracking-tight mb-8">
          The features that actually matter.
        </h2>
        <div className="rounded-2xl border border-ink/15 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-50 border-b border-ink/15">
                <th className="text-left font-medium text-ink-700 px-4 md:px-6 py-3.5">
                  Feature
                </th>
                <th className="text-left font-medium text-copper-700 px-4 md:px-6 py-3.5">
                  Copper
                </th>
                <th className="text-left font-medium text-ink-700 px-4 md:px-6 py-3.5">
                  {competitor.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {competitor.rows.map((row, i) => (
                <tr
                  key={i}
                  className={
                    i < competitor.rows.length - 1
                      ? "border-b border-ink/10"
                      : ""
                  }
                >
                  <td className="px-4 md:px-6 py-3.5 font-medium align-top">
                    {row.feature}
                  </td>
                  <td className="px-4 md:px-6 py-3.5 text-ink-700 align-top">
                    {row.copper}
                  </td>
                  <td className="px-4 md:px-6 py-3.5 text-ink-700 align-top">
                    {row.competitor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function WhenToChoose({ competitor }: { competitor: Competitor }) {
  return (
    <section className="border-b border-ink/10">
      <div className="mx-auto max-w-4xl px-6 py-14 md:py-20 grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-ink/15 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-ink-500 font-medium mb-3">
            Pick {competitor.name} if
          </div>
          <p className="text-sm text-ink-800 leading-relaxed">
            {competitor.whenToPickThem}
          </p>
        </div>
        <div className="rounded-2xl border border-copper-400 bg-copper-50/40 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-copper-700 font-medium mb-3">
            Pick Copper if
          </div>
          <p className="text-sm text-ink-800 leading-relaxed">
            {competitor.whenToPickCopper}
          </p>
        </div>
      </div>
    </section>
  );
}

function ComparisonFaq({ competitor }: { competitor: Competitor }) {
  return (
    <section id="faq" className="border-b border-ink/10">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <div className="text-xs uppercase tracking-[0.18em] text-copper-600 font-medium mb-3 text-center">
          FAQ
        </div>
        <h2 className="font-display text-3xl md:text-4xl leading-tight tracking-tight text-center mb-12">
          The questions buyers ask.
        </h2>
        <div className="divide-y divide-ink/15 border-t border-b border-ink/15">
          {competitor.faqs.map((item, i) => (
            <details key={i} className="group py-5">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-display text-lg md:text-xl pr-6">
                  {item.q}
                </span>
                <span className="font-mono text-copper-600 text-lg shrink-0 group-open:rotate-45 transition-transform duration-300">
                  +
                </span>
              </summary>
              <div className="mt-3 text-ink-700 leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ComparisonIndex({
  competitors,
  isAuthed,
}: {
  competitors: readonly Competitor[];
  isAuthed: boolean;
}) {
  return (
    <div className="bg-cream-100 text-ink min-h-screen font-sans antialiased selection:bg-copper/20">
      <SiteHeader isAuthed={isAuthed} />
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-12 md:pt-20 md:pb-14">
          <div className="text-xs uppercase tracking-[0.18em] text-copper-600 font-medium mb-4">
            Compare
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            Copper{" "}
            <span className="text-ink/40 font-light italic">vs the rest</span>
          </h1>
          <p className="mt-6 text-lg text-ink-700 max-w-2xl leading-relaxed">
            Honest comparisons of Copper against the AI receptionist products
            buyers shortlist most. Pricing, features, and which fits which
            business.
          </p>
        </div>
      </section>
      <section>
        <div className="mx-auto max-w-4xl px-6 py-14 md:py-20 grid sm:grid-cols-2 gap-4">
          {competitors.map((c) => (
            <Link
              key={c.slug}
              href={`/vs/${c.slug}`}
              className="rounded-2xl border border-ink/15 hover:border-copper-400 hover:bg-cream-50 p-6 transition-colors flex flex-col gap-2"
            >
              <div className="text-xs uppercase tracking-[0.18em] text-ink-500 font-medium">
                Compare
              </div>
              <div className="font-display text-2xl">
                Copper vs {c.name}
              </div>
              <p className="text-sm text-ink-700 leading-relaxed mt-1">
                {c.tagline}
              </p>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
