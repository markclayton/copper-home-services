/**
 * Dynamic OpenGraph image rendered with next/og. Next.js auto-emits the
 * <meta property="og:image"> tag pointing here.
 *
 * Kept inline (no external font load, no remote image fetch) so it renders
 * reliably at the edge without depending on Vercel's image proxy hitting our
 * own origin.
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Copper · AI receptionist for HVAC, plumbing, and electrical service businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COPPER = "#b4593a";
const CREAM = "#faf7f2";
const INK = "#1a1614";
const MUTED = "#6b5e54";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: CREAM,
          padding: "80px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg width="72" height="72" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill={COPPER} />
            <path
              d="M21.4 11.4c-1.1-1-2.6-1.6-4.4-1.6-3.8 0-6.5 2.7-6.5 6.3 0 3.6 2.7 6.3 6.5 6.3 1.8 0 3.3-.6 4.4-1.6"
              fill="none"
              stroke={CREAM}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <span
            style={{
              fontSize: "44px",
              fontWeight: 600,
              color: INK,
              letterSpacing: "-0.02em",
            }}
          >
            Copper
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 500,
              color: INK,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: "960px",
            }}
          >
            The AI receptionist for owner-operated home services.
          </div>
          <div
            style={{
              fontSize: "32px",
              color: MUTED,
              lineHeight: 1.3,
              maxWidth: "900px",
            }}
          >
            Answers every call, books the job, texts the customer back — so
            you can stay on the truck.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "22px",
            color: MUTED,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span>HVAC · Plumbing · Electrical</span>
          <span style={{ color: COPPER, fontWeight: 600 }}>joincopper.io</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
