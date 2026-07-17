/**
 * Version identifier for the Terms of Service and Privacy Policy currently
 * in effect. Written into user metadata at the moment of acceptance so we
 * can prove which text a user actually agreed to.
 *
 * When the terms materially change:
 *   1. Bump TERMS_VERSION to today's ISO date.
 *   2. Update TERMS_VERSION_LABEL to the human-readable month/year.
 *   3. Trigger the re-acceptance flow if you want to force existing users
 *      to accept the new version.
 */

export const TERMS_VERSION = "2026-07-17";
export const TERMS_VERSION_LABEL = "July 2026";

/** Metadata key set on auth.users when a user accepts the terms. */
export const TERMS_ACCEPTANCE_META_KEY = "terms_accepted_at";
export const TERMS_VERSION_META_KEY = "terms_version";

/** Cookie name used to bridge terms acceptance across the OAuth redirect. */
export const TERMS_ACCEPTANCE_COOKIE = "copper_terms_acceptance";
/** Cookie TTL in seconds. Short — just long enough for the OAuth round-trip. */
export const TERMS_ACCEPTANCE_COOKIE_TTL_SECONDS = 10 * 60;
