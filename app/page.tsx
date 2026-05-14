import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/landing-page";

/**
 * Server wrapper for the landing page — fetches the auth state and hands it
 * to the animated client component. Keeping data fetching here lets the
 * rest of the page use motion hooks without splitting the client/server
 * boundary across every section.
 */
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;
  return <LandingPage isAuthed={isAuthed} />;
}
