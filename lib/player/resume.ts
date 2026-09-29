/**
 * H-27: "Resume" and "Continue watching" open the player at the second the
 * backend saved (watch history's lastPosition), not at 0:00.
 *
 * The saved second travels in the link as `/player/<id>?t=<seconds>` — the
 * history rows and the episode list already hold it, so no extra request is
 * needed. Pure functions (no imports) so they can be checked on their own.
 */

/** At or past this share of a title it is finished: "Watch again" starts from the top. */
export const RESUME_COMPLETE_PERCENT = 95;

/** The search param that carries the start second. */
export const START_PARAM = "t";

/**
 * The player link for something part-watched: `?t=<saved second>` while it
 * is started but not finished, the plain link otherwise.
 */
export function resumeHref(
  movieId: string,
  progressPercent: number,
  lastPositionSeconds: number,
): string {
  const seconds = Math.floor(lastPositionSeconds);
  if (
    progressPercent >= RESUME_COMPLETE_PERCENT ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return `/player/${movieId}`;
  }
  return `/player/${movieId}?${START_PARAM}=${seconds}`;
}

/** The start second a `?t=` value asks for; null when missing or not a plain positive whole number. */
export function parseStartSeconds(
  raw: string | string[] | null | undefined,
): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d{1,6}$/.test(value)) return null;
  const seconds = Number(value);
  return seconds > 0 ? seconds : null;
}

/**
 * The requested start, unless it would land in the last 5% (the credits) —
 * then the title plays from the top, like "Watch again". An unknown
 * duration (0/null) keeps the request as it is.
 */
export function usableStartSeconds(
  start: number | null,
  durationSeconds: number | null | undefined,
): number | null {
  if (start === null) return null;
  if (
    durationSeconds &&
    durationSeconds > 0 &&
    start >= (durationSeconds * RESUME_COMPLETE_PERCENT) / 100
  ) {
    return null;
  }
  return start;
}
