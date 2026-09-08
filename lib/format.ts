/**
 * Playback clock — `m:ss` for anything under an hour, `h:mm:ss` past it, so a
 * feature-length film doesn't read as "94:12" the way a plain minute count would.
 */
export function formatTimecode(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const whole = Math.floor(totalSeconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const paddedSeconds = seconds.toString().padStart(2, "0");
  if (hours === 0) return `${minutes}:${paddedSeconds}`;
  return `${hours}:${minutes.toString().padStart(2, "0")}:${paddedSeconds}`;
}

/** Rendered where a runtime slot must stay visible but the value is unknown (labelled cells, episode rows). Meta lines omit the runtime instead. */
export const UNKNOWN_DURATION = "—";

/**
 * Runtime in minutes -> "45m" / "1h 32m". Returns null when the runtime is
 * unknown: 0 is the API's not-measured sentinel (a bulk-uploaded title whose
 * probe failed), and it must never surface as "0m".
 */
export function formatDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes)) return null;
  // Guard the ROUNDED value: 0.4 min rounds to 0 and must be unknown, not "0m".
  const whole = Math.round(minutes);
  if (whole <= 0) return null;
  const hours = Math.floor(whole / 60);
  const remainingMinutes = whole % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
