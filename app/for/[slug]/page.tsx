import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerticalLandingPage } from "@/components/landing/vertical-landing-page";
import { getVertical, verticalSlugs, type Vertical } from "@/lib/landing-verticals";
import { getExtendedFaqs } from "@/lib/vertical-faqs-extended";

export function generateStaticParams() {
  return verticalSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vertical = getVertical(slug);
  if (!vertical) return {};
  return {
    title: vertical.metaTitle,
    description: vertical.metaDescription,
    openGraph: {
      title: vertical.metaTitle,
      description: vertical.metaDescription,
    },
    twitter: {
      title: vertical.metaTitle,
      description: vertical.metaDescription,
    },
  };
}

function buildFaqJsonLd(vertical: Vertical) {
  const extended = getExtendedFaqs(vertical.slug);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...vertical.faqs, ...extended].map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export default async function VerticalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vertical = getVertical(slug);
  if (!vertical) notFound();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildFaqJsonLd(vertical)),
        }}
      />
      <VerticalLandingPage vertical={vertical} isAuthed={isAuthed} />
    </>
  );
}
