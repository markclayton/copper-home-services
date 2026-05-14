import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

// metadataBase is the absolute origin OG/Twitter image URLs resolve against.
// Prefer the canonical apex domain in production so previews always point at
// joincopper.io rather than the volatile vercel.app subdomain that VERCEL_URL
// would otherwise inject (which Slack/iMessage cache aggressively).
const defaultUrl = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL
  : process.env.VERCEL_ENV === "production"
    ? "https://joincopper.io"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

const title = "Copper · AI receptionist for home services";
const description =
  "Copper picks up every call, books the job, and texts the customer back — so owner-operators can stay on the truck. Built for HVAC, plumbing, and electrical.";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    url: defaultUrl,
    siteName: "Copper",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@joincopper",
  },
};

const fraunces = Fraunces({
  variable: "--font-display",
  display: "swap",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plexSans.variable} ${fraunces.variable} ${plexMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
