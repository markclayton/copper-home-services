/**
 * Twitter card image. Delegates to the OpenGraph generator so the previews
 * stay in sync across X, LinkedIn, Slack, iMessage, etc.
 *
 * Next.js requires `runtime` and the other metadata config fields to be
 * statically declared in this file (not re-exported), so we redeclare them
 * here and only re-use the default Image function.
 */

export { default } from "./opengraph-image";

export const runtime = "edge";

export const alt =
  "Copper · AI receptionist for HVAC, plumbing, and electrical service businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
