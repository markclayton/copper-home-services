"use client";

/**
 * Wires the client-side PostHog SDK to Supabase auth state and to Next.js
 * route changes.
 *
 * - On initial mount + every auth event (SIGNED_IN, USER_UPDATED, etc.), we
 *   call posthog.identify with the Supabase user id so backend events keyed
 *   off the same id stitch into one person.
 * - On SIGNED_OUT we call posthog.reset so a shared browser doesn't conflate
 *   the next signed-in session with the previous owner.
 * - Pageviews are captured manually because Next.js App Router doesn't fire
 *   a real navigation event PostHog can hook into. capture_pageview is off
 *   in instrumentation-client.ts; this component owns it instead.
 */

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

export function PostHogProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const supabase = createClient();

    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      posthog.identify(data.user.id, {
        email: data.user.email ?? undefined,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        posthog.reset();
        return;
      }
      if (session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email ?? undefined,
        });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (!pathname) return;
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
