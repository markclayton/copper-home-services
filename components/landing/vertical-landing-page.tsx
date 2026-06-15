"use client";

/**
 * Per-vertical landing page (e.g. /for/hvac, /for/salons). Reuses the
 * shared sections from the main landing — header, problem stats,
 * feature blocks, how-it-works, pricing, final CTA, footer — and swaps
 * in vertical-specific hero copy, call transcript, and FAQ. The dynamic
 * route at app/for/[slug]/page.tsx wires the data in from
 * lib/landing-verticals.ts.
 */

import { motion, useReducedMotion } from "motion/react";
import {
  CTAButton,
  EASE,
  FeatureBlocks,
  FinalCta,
  HeroCallCard,
  HowItWorks,
  Pricing,
  ProblemStats,
  SiteFooter,
  SiteHeader,
} from "./landing-page";
import { Reveal, RevealGroup, RevealItem } from "./reveal";
import type { Vertical } from "@/lib/landing-verticals";

export function VerticalLandingPage({
  vertical,
  isAuthed,
}: {
  vertical: Vertical;
  isAuthed: boolean;
}) {
  return (
    <div className="bg-cream-100 text-ink min-h-screen font-sans antialiased selection:bg-copper/20">
      <SiteHeader isAuthed={isAuthed} />
      <VerticalHero vertical={vertical} isAuthed={isAuthed} />
      <ProblemStats />
      <FeatureBlocks />
      <HowItWorks />
      <Pricing isAuthed={isAuthed} />
      <VerticalFaq vertical={vertical} />
      <FinalCta isAuthed={isAuthed} />
      <SiteFooter />
    </div>
  );
}

function VerticalHero({
  vertical,
  isAuthed,
}: {
  vertical: Vertical;
  isAuthed: boolean;
}) {
  const reduced = useReducedMotion();
  const slide = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  });

  return (
    <section className="border-b border-ink/10 relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-[1.05fr_1fr] gap-12 md:gap-16 items-center">
        <div className="flex flex-col gap-6">
          <motion.div
            className="inline-flex self-start items-center gap-2 text-xs uppercase tracking-[0.18em] text-copper-600 font-medium"
            initial={{ opacity: 0, x: reduced ? 0 : -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <motion.span
              className="h-px bg-copper-500"
              initial={{ width: 0 }}
              animate={{ width: 24 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
            />
            {vertical.heroEyebrow}
          </motion.div>
          <motion.h1
            className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight"
            {...slide(0.1)}
          >
            {vertical.heroHeadline}{" "}
            <motion.span
              className="text-copper-600 italic font-light inline-block"
              initial={{ opacity: 0, y: reduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
            >
              {vertical.heroHeadlineAccent}
            </motion.span>
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-ink-700 max-w-xl leading-relaxed"
            {...slide(0.35)}
          >
            {vertical.heroSubhead}
          </motion.p>
          <motion.div
            className="flex flex-wrap items-center gap-3 mt-2"
            {...slide(0.5)}
          >
            <CTAButton
              href={isAuthed ? "/dashboard" : "/auth/sign-up"}
              label={
                isAuthed ? "Open your dashboard" : "Start your AI receptionist"
              }
              prominent
            />
            <a
              href="#how"
              className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-ink px-3 py-2"
            >
              See how it works
            </a>
          </motion.div>
          <motion.p className="text-xs text-ink-500 mt-1" {...slide(0.65)}>
            From $79/month · No setup fee · Cancel anytime
          </motion.p>
        </div>

        <HeroCallCard
          content={{
            callerName: vertical.callerName,
            callerPhone: vertical.callerPhone,
            transcript: vertical.callTranscript,
            bookingLabel: vertical.bookingLabel,
            smsToCaller: vertical.smsToCaller,
          }}
        />
      </div>
    </section>
  );
}

function VerticalFaq({ vertical }: { vertical: Vertical }) {
  return (
    <section id="faq" className="border-b border-ink/10">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <Reveal className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.18em] text-copper-600 font-medium mb-3">
            Common questions
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-tight tracking-tight">
            What {vertical.audience} ask first.
          </h2>
        </Reveal>
        <RevealGroup
          className="divide-y divide-ink/15 border-t border-b border-ink/15"
          stagger={0.05}
        >
          {vertical.faqs.map((item, i) => (
            <RevealItem key={i}>
              <details className="group py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-display text-lg md:text-xl pr-6">
                    {item.q}
                  </span>
                  <span className="font-mono text-copper-600 text-lg shrink-0 group-open:rotate-45 transition-transform duration-300">
                    +
                  </span>
                </summary>
                <div className="mt-3 text-ink-700 leading-relaxed">
                  {item.a}
                </div>
              </details>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
