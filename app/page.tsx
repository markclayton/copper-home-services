import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Hammer,
  MessageSquare,
  Phone,
  Star,
  Wrench,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  return (
    <div className="bg-cream-100 text-ink min-h-screen font-sans antialiased selection:bg-copper/20">
      <SiteHeader isAuthed={isAuthed} />
      <Hero isAuthed={isAuthed} />
      <IndustryStrip />
      <ProblemStats />
      <FeatureBlocks />
      <HowItWorks />
      <Pricing isAuthed={isAuthed} />
      <Faq />
      <FinalCta isAuthed={isAuthed} />
      <SiteFooter />
    </div>
  );
}

/* ─── Header ──────────────────────────────────────────────────────────── */

function SiteHeader({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header className="border-b border-ink/10 bg-cream-100/90 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <CopperMark />
          <span className="font-display text-xl tracking-tight">Copper</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-700">
          <a href="#features" className="hover:text-ink transition-colors">
            Features
          </a>
          <a href="#how" className="hover:text-ink transition-colors">
            How it works
          </a>
          <a href="#pricing" className="hover:text-ink transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-ink transition-colors">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 bg-ink text-cream-100 text-sm font-medium px-4 py-2 rounded-md hover:bg-copper-700 transition-colors"
            >
              Dashboard <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden sm:inline-flex text-sm text-ink-700 hover:text-ink px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/onboard"
                className="inline-flex items-center gap-1.5 bg-ink text-cream-100 text-sm font-medium px-4 py-2 rounded-md hover:bg-copper-700 transition-colors"
              >
                Get started <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function CopperMark() {
  return (
    <div className="relative h-7 w-7 grid place-items-center rounded-md bg-copper text-cream-100 shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]">
      <span className="font-display font-bold text-sm leading-none">C</span>
    </div>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────── */

function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="border-b border-ink/10 relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-[1.05fr_1fr] gap-12 md:gap-16 items-center">
        <div className="flex flex-col gap-6">
          <div className="inline-flex self-start items-center gap-2 text-xs uppercase tracking-[0.18em] text-copper-600 font-medium">
            <span className="h-px w-6 bg-copper-500" />
            For owner-operators
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
            Your AI front desk.{" "}
            <span className="text-copper-600 italic font-light">
              Always answers.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-ink-700 max-w-xl leading-relaxed">
            Copper picks up every call, books the job, and texts the customer
            back — so you can stay on the truck. Live in under an hour. No
            setup fee.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Link
              href={isAuthed ? "/dashboard" : "/onboard"}
              className="inline-flex items-center gap-2 bg-copper-600 text-cream-100 font-medium px-5 py-3 rounded-md hover:bg-copper-700 transition-colors shadow-[0_1px_0_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.18)]"
            >
              {isAuthed
                ? "Open your dashboard"
                : "Start your AI receptionist"}{" "}
              <ArrowRight size={16} />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-ink px-3 py-2"
            >
              See how it works
            </a>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            $500/month · No setup fee · Cancel anytime
          </p>
        </div>

        <HeroCallCard />
      </div>
    </section>
  );
}

function HeroCallCard() {
  return (
    <div className="relative">
      {/* Decorative blueprint grid behind the card */}
      <div
        aria-hidden
        className="absolute -inset-6 rounded-2xl opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #1a1815 1px, transparent 1px), linear-gradient(to bottom, #1a1815 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative rounded-xl border border-ink/15 bg-cream-50 shadow-[0_30px_60px_-25px_rgba(26,24,21,0.25)] overflow-hidden">
        {/* Card top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink/10 bg-cream-200">
          <div className="flex items-center gap-2 text-xs text-ink-500 font-mono">
            <span className="h-2 w-2 rounded-full bg-copper-500 animate-pulse" />
            INCOMING CALL · 0:14
          </div>
          <span className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">
            Live
          </span>
        </div>
        <div className="p-5 space-y-4">
          {/* Caller row */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-ink-500 mb-1">
                Caller
              </div>
              <div className="font-display text-2xl leading-tight">
                Sarah Mitchell
              </div>
              <div className="font-mono text-sm text-ink-500 mt-0.5">
                (415) 555-0142
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-ink-500 mb-1">
                Status
              </div>
              <div className="inline-flex items-center gap-1.5 bg-patina-100 text-patina-500 text-xs font-medium px-2.5 py-1 rounded">
                <Check size={12} /> Booked
              </div>
            </div>
          </div>

          {/* Transcript snippets */}
          <div className="space-y-2 pt-2 border-t border-ink/10">
            <TranscriptLine
              who="Sarah"
              text="Hi, my kitchen sink is backed up. Can someone come out today?"
            />
            <TranscriptLine
              who="Copper AI"
              text="Sounds like a clog. I can get you in at 2pm or 4pm today — what works?"
              ai
            />
            <TranscriptLine who="Sarah" text="2pm works." />
          </div>

          {/* Booking confirmation row */}
          <div className="rounded-md bg-copper-50 border border-copper-200 px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-copper-700 font-medium mb-0.5">
                Booked appointment
              </div>
              <div className="text-sm font-medium text-ink">
                Drain cleaning · Today, 2:00 PM
              </div>
            </div>
            <Calendar size={20} className="text-copper-600" />
          </div>
        </div>
      </div>

      {/* Floating SMS preview */}
      <div className="hidden md:block absolute -bottom-8 -left-10 w-64 rounded-lg border border-ink/15 bg-cream-50 shadow-[0_20px_40px_-20px_rgba(26,24,21,0.35)] p-3.5">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-mono mb-2">
          SMS to Sarah · Just now
        </div>
        <div className="text-sm text-ink leading-snug">
          Confirmed — drain cleaning today at 2:00 PM. We&apos;ll text 15 min
          before arrival.
        </div>
      </div>
    </div>
  );
}

function TranscriptLine({
  who,
  text,
  ai,
}: {
  who: string;
  text: string;
  ai?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`text-[10px] uppercase tracking-wider font-mono pt-1 w-16 shrink-0 ${
          ai ? "text-copper-600" : "text-ink-500"
        }`}
      >
        {who}
      </div>
      <div className="text-sm text-ink-700 leading-snug">{text}</div>
    </div>
  );
}

/* ─── Industry strip ──────────────────────────────────────────────────── */

function IndustryStrip() {
  const items = [
    { icon: Wrench, label: "Plumbing" },
    { icon: Zap, label: "Electrical" },
    { icon: Hammer, label: "HVAC" },
    { icon: Wrench, label: "Garage door" },
    { icon: Hammer, label: "Roofing" },
    { icon: Zap, label: "Pest control" },
  ];
  return (
    <section className="border-b border-ink/10 bg-cream-200">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
          <div className="text-xs uppercase tracking-[0.18em] text-ink-500 font-medium shrink-0">
            Built for the trades
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-ink-700">
            {items.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Icon size={14} className="text-copper-600" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Problem stats ───────────────────────────────────────────────────── */

function ProblemStats() {
  const stats = [
    {
      number: "1 in 3",
      label: "calls go unanswered at the average service business",
    },
    { number: "$300+", label: "average job value lost per missed call" },
    {
      number: "5 min",
      label: "after which most leads pick a different company",
    },
  ];
  return (
    <section className="border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-3xl md:text-4xl leading-tight tracking-tight">
            Every missed call is a job you handed your competitor.
          </h2>
          <p className="text-ink-700 mt-4 text-lg leading-relaxed">
            You can&apos;t answer the phone with your hands on a wrench. The
            old fix was hiring an in-house receptionist or an answering
            service. Both are slow, expensive, and miss the moment.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="border border-ink/15 bg-cream-50 p-6 rounded-md"
            >
              <div className="font-display text-5xl text-copper-600 leading-none tracking-tight">
                {s.number}
              </div>
              <div className="text-sm text-ink-700 mt-3 leading-snug">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Feature blocks ──────────────────────────────────────────────────── */

function FeatureBlocks() {
  return (
    <section id="features" className="border-b border-ink/10 bg-cream-200">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 space-y-20 md:space-y-32">
        <FeatureRow
          eyebrow="Answer"
          headline="Picks up every call. Sounds like a person."
          body="Copper answers within two rings, day or night. Your AI is trained on your services, your pricing, and your tone — not a generic script. It can take messages, qualify leads, and triage emergencies."
          bullets={[
            "Answers on the first ring, 24/7",
            "Pick your AI's voice — six options",
            "Routes emergencies to your cell immediately",
          ]}
          visual={<AnswerVisual />}
        />
        <FeatureRow
          reverse
          eyebrow="Book"
          headline="Fills your calendar without you lifting a finger."
          body="Connected to your Cal.com calendar. Copper checks real availability, books the slot, and confirms with the customer over text — all before they hang up."
          bullets={[
            "Real calendar — not a callback promise",
            "Customer gets a confirmation SMS instantly",
            "Owner gets a booking alert with caller details",
          ]}
          visual={<BookVisual />}
        />
        <FeatureRow
          eyebrow="Follow up"
          headline="Turns happy customers into Google reviews."
          body="Two hours after every completed job, Copper texts a friendly review request with a one-tap link. One nudge 48 hours later if they haven't replied. That's it — no spam."
          bullets={[
            "Auto-fires after every appointment",
            "Tracked link → straight to your Google profile",
            "One reminder, then we stop bugging them",
          ]}
          visual={<ReviewVisual />}
        />
      </div>
    </section>
  );
}

function FeatureRow({
  eyebrow,
  headline,
  body,
  bullets,
  visual,
  reverse,
}: {
  eyebrow: string;
  headline: string;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center ${
        reverse ? "md:[&>*:first-child]:order-2" : ""
      }`}
    >
      <div className="flex flex-col gap-5">
        <div className="text-xs uppercase tracking-[0.18em] text-copper-600 font-medium">
          {eyebrow}
        </div>
        <h3 className="font-display text-3xl md:text-4xl leading-[1.1] tracking-tight">
          {headline}
        </h3>
        <p className="text-ink-700 leading-relaxed">{body}</p>
        <ul className="space-y-2.5 mt-1">
          {bullets.map((b) => (
            <li key={b} className="flex gap-3 text-ink-700">
              <CheckCircle2
                size={18}
                className="text-copper-600 shrink-0 mt-0.5"
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>{visual}</div>
    </div>
  );
}

function AnswerVisual() {
  return (
    <div className="relative rounded-xl border border-ink/15 bg-cream-50 overflow-hidden shadow-[0_24px_50px_-30px_rgba(26,24,21,0.3)]">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-ink/10 bg-cream-200">
        <Phone size={14} className="text-copper-600" />
        <span className="font-mono text-xs text-ink-700">Call · Today</span>
      </div>
      <div className="p-5 space-y-3">
        <TranscriptBubble
          who="Caller"
          text="My AC just died and it's 95 out. Can someone come today?"
        />
        <TranscriptBubble
          who="Copper"
          ai
          text="That sounds urgent — let me check today's emergency slots. I have 1pm or 4:30pm available. Which works for you?"
        />
        <TranscriptBubble who="Caller" text="1pm please." />
        <TranscriptBubble
          who="Copper"
          ai
          text="Booked. We'll text you when the tech is 15 minutes out."
        />
      </div>
    </div>
  );
}

function TranscriptBubble({
  who,
  text,
  ai,
}: {
  who: string;
  text: string;
  ai?: boolean;
}) {
  return (
    <div className={`flex ${ai ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3.5 py-2 text-sm leading-snug ${
          ai
            ? "bg-copper text-cream-100"
            : "bg-cream-200 text-ink border border-ink/10"
        }`}
      >
        <div
          className={`text-[10px] uppercase tracking-wider font-mono mb-1 ${
            ai ? "text-cream-200" : "text-ink-500"
          }`}
        >
          {who}
        </div>
        {text}
      </div>
    </div>
  );
}

function BookVisual() {
  const slots = [
    { time: "9:00 AM", label: "Available" },
    { time: "11:30 AM", label: "Booked", customer: "J. Park · Tune-up" },
    { time: "1:00 PM", label: "Available" },
    {
      time: "2:00 PM",
      label: "Just booked",
      customer: "S. Mitchell · Drain",
      active: true,
    },
    { time: "4:30 PM", label: "Available" },
  ];
  return (
    <div className="rounded-xl border border-ink/15 bg-cream-50 overflow-hidden shadow-[0_24px_50px_-30px_rgba(26,24,21,0.3)]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-ink/10 bg-cream-200">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-copper-600" />
          <span className="font-mono text-xs text-ink-700">
            Tuesday, May 12
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-ink-500">
          2 of 5 booked
        </span>
      </div>
      <div className="divide-y divide-ink/10">
        {slots.map((s) => (
          <div
            key={s.time}
            className={`flex items-center justify-between px-5 py-3.5 ${
              s.active ? "bg-copper-50" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm text-ink-700 w-20">
                {s.time}
              </span>
              {s.customer ? (
                <span className="text-sm text-ink">{s.customer}</span>
              ) : (
                <span className="text-sm text-ink-400">—</span>
              )}
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                s.active
                  ? "bg-copper text-cream-100"
                  : s.label === "Booked"
                    ? "bg-ink/10 text-ink-700"
                    : "text-ink-400"
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewVisual() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-ink/15 bg-cream-50 p-5 shadow-[0_24px_50px_-30px_rgba(26,24,21,0.3)]">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-ink-500 font-mono mb-3">
          <MessageSquare size={12} /> SMS to Sarah · Today
        </div>
        <div className="text-[15px] text-ink leading-relaxed">
          Hey Sarah — thanks for choosing us today! If we did right by you,
          would you leave a quick Google review?{" "}
          <span className="text-copper-600 underline">copper.li/r/x9k2</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { stat: "82%", label: "open rate" },
          { stat: "31%", label: "review rate" },
          { stat: "5★", label: "average" },
        ].map((m) => (
          <div
            key={m.label}
            className="border border-ink/15 bg-cream-50 rounded-md p-4"
          >
            <div className="font-display text-2xl text-copper-600 leading-none">
              {m.stat}
            </div>
            <div className="text-xs text-ink-500 mt-1.5">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── How it works ────────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Tell us about your business",
      body: "Five-minute setup. Hours, services, prices, the works. Paste your website URL and we draft most of it for you.",
    },
    {
      n: "02",
      title: "We give you a phone number",
      body: "Forward your existing number to it, or use the new one. Your AI is ready before you finish your coffee.",
    },
    {
      n: "03",
      title: "Your AI starts answering",
      body: "Every call shows up in your dashboard with a transcript, summary, and any booking it made.",
    },
  ];
  return (
    <section
      id="how"
      className="border-b border-ink/10 relative overflow-hidden"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.18em] text-copper-600 font-medium mb-3">
            How it works
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-tight tracking-tight">
            From signup to ringing phone in under an hour.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-ink/10 border border-ink/15 rounded-lg overflow-hidden">
          {steps.map((s) => (
            <div
              key={s.n}
              className="bg-cream-50 p-8 flex flex-col gap-4 md:min-h-[260px]"
            >
              <div className="font-mono text-xs text-copper-600 tracking-wider">
                {s.n}
              </div>
              <div className="font-display text-2xl leading-tight">
                {s.title}
              </div>
              <p className="text-ink-700 leading-relaxed text-[15px]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────────────────── */

function Pricing({ isAuthed }: { isAuthed: boolean }) {
  const included = [
    "Dedicated AI receptionist",
    "Local phone number included",
    "Unlimited inbound calls",
    "Real-time call transcripts & summaries",
    "Calendar booking via Cal.com",
    "Automated review requests",
    "SMS + email owner notifications",
    "Cancel anytime, no questions",
  ];
  return (
    <section id="pricing" className="border-b border-ink/10 bg-cream-200">
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.18em] text-copper-600 font-medium mb-3">
            Pricing
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-tight tracking-tight">
            One plan. Everything included.
          </h2>
          <p className="text-ink-700 mt-3">
            No setup fee. No per-minute charges. No sales calls.
          </p>
        </div>

        <div className="relative">
          {/* Outer accent border */}
          <div className="absolute -inset-1 rounded-xl bg-copper opacity-100" />
          <div className="relative rounded-xl bg-cream-50 border border-ink/15 p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-8 items-end">
            <div>
              <div className="text-xs uppercase tracking-wider text-ink-500 font-medium">
                Copper · monthly
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-display text-6xl md:text-7xl leading-none tracking-tight">
                  $500
                </span>
                <span className="text-ink-500">/month</span>
              </div>
              <p className="text-sm text-ink-500 mt-2">
                Billed monthly. Cancel anytime.
              </p>

              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-8">
                {included.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-ink-700"
                  >
                    <Check
                      size={16}
                      className="text-copper-600 shrink-0 mt-0.5"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={isAuthed ? "/dashboard" : "/onboard"}
              className="inline-flex items-center justify-center gap-2 bg-copper-600 text-cream-100 font-medium px-6 py-3 rounded-md hover:bg-copper-700 transition-colors w-full md:w-auto shadow-[0_1px_0_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.18)]"
            >
              {isAuthed ? "Open dashboard" : "Get started"}{" "}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-ink-500 mt-6">
          Carrier fees for SMS and outbound calls billed at cost. Typically
          under $20/month for a busy shop.
        </p>
      </div>
    </section>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────────────────── */

function Faq() {
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: "Can I keep my existing phone number?",
      a: "Yes. Most owners forward their existing number to the Copper number we give you. Calls still ring to Copper — your number stays printed on the truck.",
    },
    {
      q: "What happens if the AI doesn't know an answer?",
      a: "It takes a message and texts you with the caller's name, number, and what they wanted. You decide whether to call back. The AI never guesses at pricing or makes up policies.",
    },
    {
      q: "Will it sound like a robot?",
      a: "No. You pick one of six natural voices during setup. Most callers don't realize they're talking to an AI until you tell them.",
    },
    {
      q: "How long until it's live?",
      a: "Under an hour for self-serve. The longest step is filling out your services and hours — and we'll draft most of it from your website if you paste a URL.",
    },
    {
      q: "What if my customer wants to talk to a human?",
      a: "The AI hands off cleanly. You can configure it to call your cell directly, take a message, or send the call to voicemail — whatever you prefer.",
    },
    {
      q: "Can I cancel?",
      a: "Anytime. No contracts, no cancellation fee. We'll release your number or port it out if you ask.",
    },
  ];
  return (
    <section id="faq" className="border-b border-ink/10">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.18em] text-copper-600 font-medium mb-3">
            Common questions
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-tight tracking-tight">
            The stuff every owner asks first.
          </h2>
        </div>
        <div className="divide-y divide-ink/15 border-t border-b border-ink/15">
          {items.map((item, i) => (
            <details key={i} className="group py-5">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-display text-lg md:text-xl pr-6">
                  {item.q}
                </span>
                <span className="font-mono text-copper-600 text-lg shrink-0 group-open:rotate-45 transition-transform">
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

/* ─── Final CTA ───────────────────────────────────────────────────────── */

function FinalCta({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="relative border-b border-ink/10 bg-ink text-cream-100 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #faf7f2 1px, transparent 1px), linear-gradient(to bottom, #faf7f2 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6 py-20 md:py-28 text-center flex flex-col items-center gap-6">
        <h2 className="font-display text-4xl md:text-5xl leading-tight tracking-tight">
          Stop missing calls.{" "}
          <span className="text-copper-300 italic font-light">
            Start booking jobs.
          </span>
        </h2>
        <p className="text-cream-200/80 max-w-xl text-lg leading-relaxed">
          Five minutes to set up. Cancel anytime. Your AI receptionist is ready
          before you finish reading this.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-copper-600 text-cream-100 font-medium px-6 py-3 rounded-md hover:bg-copper-700 transition-colors shadow-[0_1px_0_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]"
            >
              Open dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link
                href="/onboard"
                className="inline-flex items-center gap-2 bg-copper-600 text-cream-100 font-medium px-6 py-3 rounded-md hover:bg-copper-700 transition-colors shadow-[0_1px_0_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]"
              >
                Get started <ArrowRight size={16} />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-cream-100/80 hover:text-cream-100 font-medium px-4 py-3"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-copper-300 mt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={14} className="fill-current" />
          ))}
          <span className="text-xs text-cream-200/60 ml-2 font-mono">
            Built for owner-operators
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────── */

function SiteFooter() {
  return (
    <footer className="bg-cream-100">
      <div className="mx-auto max-w-6xl px-6 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CopperMark />
            <span className="font-display text-xl">Copper</span>
          </div>
          <p className="text-sm text-ink-500 max-w-xs leading-relaxed">
            AI receptionist for owner-operated home services. Built in
            California.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how" },
            { label: "Pricing", href: "#pricing" },
            { label: "Sign in", href: "/auth/login" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { label: "Contact", href: "/contact" },
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
          ]}
        />
        <FooterCol
          title="Get help"
          links={[
            { label: "support@joincopper.io", href: "mailto:support@joincopper.io" },
          ]}
        />
      </div>
      <div className="border-t border-ink/10">
        <div className="mx-auto max-w-6xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-500">
          <div>© {new Date().getFullYear()} Copper. All rights reserved.</div>
          <div className="font-mono">v1.0</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink-500 font-medium mb-3">
        {title}
      </div>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-ink-700 hover:text-ink transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
