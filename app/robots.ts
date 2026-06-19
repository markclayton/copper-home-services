import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * robots.txt — let crawlers index marketing pages; block authed and
 * webhook surfaces explicitly so accidental crawler hits don't show up
 * in indexes or hammer Twilio/Vapi webhook handlers.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.APP_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/onboard/",
          "/auth/",
          "/account-paused",
          "/account-pending",
          "/r/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
