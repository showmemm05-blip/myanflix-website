/**
 * "Continue with Google" — the OAuth 2.0 Web client ID, baked into the
 * bundle at build time exactly like NEXT_PUBLIC_API_BASE_URL. The literal
 * `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID` reference is what Next inlines;
 * reading it through any indirection would leave it undefined in the browser.
 *
 * `null` means the feature is off: the button (and its divider) never render
 * and the phone flow is the only sign-in. Must equal the backend's
 * GOOGLE_CLIENT_ID — the backend verifies every ID token's audience against
 * its copy. No client secret exists anywhere on the website.
 */
export const GOOGLE_CLIENT_ID: string | null =
  (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim() || null;

let warned = false;

/**
 * One dev-only console line so a missing button is a known state rather
 * than a mystery — never in production, never more than once per load.
 */
export function warnGoogleAuthUnconfiguredOnce(): void {
  if (warned || process.env.NODE_ENV === "production") return;
  warned = true;
  console.warn('[auth] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — "Continue with Google" is hidden.');
}
