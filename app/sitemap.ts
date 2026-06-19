import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { verticalSlugs } from "@/lib/landing-verticals";
import { competitorSlugs } from "@/lib/competitors";

/**
 * Sitemap entries Google should crawl. Static marketing pages plus the
 * full set of /for/{vertical} and /vs/{competitor} dynamic routes.
 * Authed surfaces (dashboard, onboarding, auth) are intentionally
 * excluded — they're not indexable and would just waste crawl budget.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.APP_URL.replace(/\/$/, "");
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    {
      url: `${base}/missed-call-calculator`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/vs`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/contact-sales`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/contact`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const verticalRoutes: MetadataRoute.Sitemap = verticalSlugs().map((slug) => ({
    url: `${base}/for/${slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  const comparisonRoutes: MetadataRoute.Sitemap = competitorSlugs().map(
    (slug) => ({
      url: `${base}/vs/${slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  );

  return [...staticRoutes, ...verticalRoutes, ...comparisonRoutes];
}
