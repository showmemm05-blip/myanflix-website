/**
 * Where to send someone back after they sign in.
 *
 * A guest who hits a "Sign in to watch" wall should land on the exact page
 * they were looking at once the OTP goes through, not on the home screen.
 * The destination travels as `/login?next=<path>` and is validated on the
 * way back out so a crafted link can never bounce a fresh session off-site.
 */

/**
 * Accepts only a same-origin path: starts with a single `/`, is not a
 * protocol-relative `//host` URL, and carries no scheme. Anything else — an
 * absolute URL, `javascript:`, a bare word, a backslash trick — yields null
 * so the caller falls back to its default.
 */
export function safeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  // A scheme (`https:`) can only sit before the first `/`, and the string
  // already starts with one — so the remaining risk is whitespace or
  // control characters, which a legitimate in-app path never contains.
  if (/[\s\u0000-\u001f\u007f]/.test(raw)) return null;
  return raw;
}

/** The login URL that brings the user back to `next` once they are signed in. */
export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
