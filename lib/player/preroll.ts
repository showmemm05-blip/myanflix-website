/**
 * Pre-roll advertisement (2026-11-03): before a title plays, the backend may
 * hand the player one MP4 ad (`POST /ads/preroll`). The ad plays on the SAME
 * `<video>` element the title will use (so the first Play click's gesture
 * permission carries over to the movie on iOS), then the movie builds and
 * starts by itself.
 *
 * Everything here is pure (no imports, no DOM) so the rules can be checked
 * on their own: `node --test lib/player/preroll.test.ts`. The page wires
 * them to React state, refs and the element.
 */

/** What `POST /ads/preroll` hands back when an ad is due. */
export interface PrerollAd {
  /** The impression id — every event for this play goes to it. */
  playbackId: string;
  advertisementId: string;
  title: string;
  /** Signed MP4 link on the cache server (Range + CORS `*`), valid 4 h. */
  videoUrl: string;
  durationSeconds: number;
  isSkippable: boolean;
  /** Seconds into the ad before Skip appears; null when the ad cannot be skipped. */
  skipAfterSeconds: number | null;
}

export type AdPlaybackEvent = "started" | "completed" | "skipped" | "failed";
/** How an ad left the picture — the terminal event sent for it. */
export type AdFinishReason = Exclude<AdPlaybackEvent, "started">;

/** The decision must answer this fast or the title plays without an ad. */
export const PREROLL_DECISION_TIMEOUT_MS = 4_000;
/** An ad that buffers this long without moving is given up as failed. */
export const PREROLL_STALL_MS = 10_000;
/**
 * The admin's "Same movie again" rule (Advertisements → Playback rules,
 * 2026-11-04) lives on the SERVER only: after an ad started before a title,
 * the decision answers "no ad" for that title until the minutes have passed.
 * The tab keeps no memory of its own — one would outlast a setting the admin
 * has just lowered — so every open asks.
 */

/** Where the page is with the ad for the current title. */
export type AdPhase = "idle" | "playing" | "done";

/**
 * What the player shows, derived every render:
 *   deciding — the backend has not answered yet (spinner, nothing to play);
 *   ready    — an ad is due and waits for the first Play gesture;
 *   playing  — the ad is on the element;
 *   done     — no ad (none due, decision failed or timed out) or it finished:
 *              the title may build and play.
 */
export type AdStage = "deciding" | "ready" | "playing" | "done";

export function prerollStage(input: { decided: boolean; ad: PrerollAd | null; phase: AdPhase }): AdStage {
  if (input.phase === "done") return "done";
  if (!input.decided) return "deciding";
  if (input.ad === null) return "done";
  return input.phase === "playing" ? "playing" : "ready";
}

/**
 * Whole seconds of ad left, for the countdown. The element's own duration
 * wins once it is known (loadedmetadata); the backend's figure fills in
 * before that. Never negative.
 */
export function adSecondsLeft(currentTime: number, mediaDuration: number, fallbackDuration: number): number {
  const duration = isUsableDuration(mediaDuration)
    ? mediaDuration
    : isUsableDuration(fallbackDuration)
      ? fallbackDuration
      : 0;
  const time = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0;
  return Math.max(0, Math.ceil(duration - time));
}

function isUsableDuration(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Whether the Skip button may show yet, and if not, how long until it does. */
export type SkipState = { kind: "none" } | { kind: "wait"; secondsLeft: number } | { kind: "ready" };

export function skipState(ad: Pick<PrerollAd, "isSkippable" | "skipAfterSeconds">, currentTime: number): SkipState {
  if (!ad.isSkippable) return { kind: "none" };
  const after = ad.skipAfterSeconds ?? 0;
  const time = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0;
  if (time >= after) return { kind: "ready" };
  return { kind: "wait", secondsLeft: Math.max(1, Math.ceil(after - time)) };
}

/**
 * One play's event book-keeping: each event name goes to the backend at
 * most once, however many times the element repeats itself (`playing`
 * fires again after every rebuffer, say). Kept in a ref by the page.
 */
export interface AdEventLedger {
  playbackId: string;
  sent: Set<AdPlaybackEvent>;
}

export function createAdEventLedger(playbackId: string): AdEventLedger {
  return { playbackId, sent: new Set() };
}

/**
 * Claims an event for sending: true the first time, false for a repeat — and
 * false for anything at all once a terminal event (completed / skipped /
 * failed) has gone, since the play is over either way.
 */
export function claimAdEvent(ledger: AdEventLedger, event: AdPlaybackEvent): boolean {
  if (ledger.sent.has(event)) return false;
  for (const sent of ledger.sent) {
    if (sent !== "started") return false;
  }
  ledger.sent.add(event);
  return true;
}

/** The element's currentTime as the integer `positionSeconds` the event API takes. */
export function adEventPosition(currentTime: number | undefined | null): number {
  if (typeof currentTime !== "number" || !Number.isFinite(currentTime) || currentTime <= 0) return 0;
  return Math.floor(currentTime);
}
