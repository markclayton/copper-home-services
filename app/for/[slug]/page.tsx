import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerticalLandingPage } from "@/components/landing/vertical-landing-page";
import { getVertical, verticalSlugs } from "@/lib/landing-verticals";

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

  return <VerticalLandingPage vertical={vertical} isAuthed={isAuthed} />;
}
