import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["sociologically-pleuropneumonic-leon.ngrok-free.dev"],
};

// Sentry's webpack plugin uploads source maps at build time. It only runs when
// SENTRY_AUTH_TOKEN + org/project are set, so local dev / unconfigured builds
// keep working unchanged.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  // Only attempt source-map upload when we have credentials.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
