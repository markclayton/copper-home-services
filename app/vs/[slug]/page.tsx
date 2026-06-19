import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonPage } from "@/components/landing/comparison-page";
import { createClient } from "@/lib/supabase/server";
import {
  competitorSlugs,
  getCompetitor,
  type Competitor,
} from "@/lib/competitors";

export function generateStaticParams() {
  return competitorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) return {};
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    openGraph: { title: c.metaTitle, description: c.metaDescription },
    twitter: { title: c.metaTitle, description: c.metaDescription },
    alternates: { canonical: `/vs/${c.slug}` },
  };
}

/**
 * FAQPage structured data so the comparison-page FAQs surface as rich
 * results in search. We emit it as a <script> in the page body — Google
 * recommends it adjacent to the visible Q&A.
 */
function buildFaqJsonLd(c: Competitor) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export default async function ComparisonRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) notFound();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(c)) }}
      />
      <ComparisonPage competitor={c} isAuthed={isAuthed} />
    </>
  );
}
