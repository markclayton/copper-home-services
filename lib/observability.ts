import * as Sentry from "@sentry/nextjs";

/**
 * Centralized error reporting. Use in catch blocks where the error should be
 * surfaced to Sentry without re-throwing. No-ops gracefully when Sentry isn't
 * configured (no DSN).
 *
 * Always pair with a structured row in the `events` table — Sentry is for
 * on-call paging, `events` is for in-app debugging by an operator.
 */
export function reportError(
  err: unknown,
  context?: {
    businessId?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  },
) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    if (context?.businessId) {
      scope.setTag("business_id", context.businessId);
    }
    if (context?.tags) {
      for (const [k, v] of Object.entries(context.tags)) scope.setTag(k, v);
    }
    if (context?.extra) {
      scope.setContext("extra", context.extra);
    }
    if (err instanceof Error) {
      Sentry.captureException(err);
    } else {
      Sentry.captureMessage(String(err), "error");
    }
  });
}
