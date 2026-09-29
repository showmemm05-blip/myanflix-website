/**
 * H-20: telling a dead session apart from a server we simply could not reach.
 *
 * Only the server refusing the session may sign the user out. A timeout, no
 * network, a DNS failure, a rate limit or a 5xx while the backend restarts
 * says nothing about the session — clearing the tokens on one of those threw
 * away a perfectly good sign-in, and getting back in costs a password AND an
 * SMS code. Pure functions (no imports) so they can be checked on their own.
 */

/**
 * Statuses that mean "no verdict yet — try again later". 0 is what the API
 * client reports when no HTTP response arrived at all.
 */
export function isTransientStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/**
 * Did POST /auth/refresh really refuse the refresh token? 401 is the backend's
 * answer for an invalid, expired, reused or revoked token and for an account
 * that is no longer active; 400/403 can only mean the same token will never
 * be accepted. `undefined` (no response at all) and every other status —
 * 404 from a proxy mid-deploy, 408, 429, 5xx — are NOT a refusal.
 */
export function isRefreshRefusal(status: number | undefined): boolean {
  return status === 400 || status === 401 || status === 403;
}
