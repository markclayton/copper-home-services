import type { Metadata } from "next";
import { ComparisonIndex } from "@/components/landing/comparison-page";
import { createClient } from "@/lib/supabase/server";
import { COMPETITORS } from "@/lib/competitors";

export const metadata: Metadata = {
  title: "Copper vs the rest · AI receptionist comparisons",
  description:
    "Honest, side-by-side comparisons of Copper and the AI receptionists buyers shortlist most. Pricing, features, and which fits which business.",
  alternates: { canonical: "/vs" },
};

export default async function CompareIndexPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;
  return <ComparisonIndex competitors={COMPETITORS} isAuthed={isAuthed} />;
}
