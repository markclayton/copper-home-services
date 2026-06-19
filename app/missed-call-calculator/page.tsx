import type { Metadata } from "next";
import { MissedCallCalculatorPage } from "@/components/landing/missed-call-calculator";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Missed-call revenue calculator · Copper",
  description:
    "Estimate the monthly and yearly revenue your small business is losing to unanswered calls. Industry presets for HVAC, plumbing, electrical, salons, dental, and more.",
  alternates: { canonical: "/missed-call-calculator" },
  openGraph: {
    title: "What missed calls are costing you · Copper",
    description:
      "Three sliders. Real numbers. See how much revenue walks past you every month because no one answered the phone.",
  },
};

export default async function MissedCallCalculatorRoute() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;
  return <MissedCallCalculatorPage isAuthed={isAuthed} />;
}
