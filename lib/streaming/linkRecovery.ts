/**
 * The player's recovery budget: what to do when hls.js (or Safari's native
 * HLS engine) reports a fatal playback error, and when to stop trying.
 *
 * Before this (audit FE-002 / STR-011, 2026-10-09) only the 403/410 branch
 * was capped. Every other fatal network error called `startLoad()` with no
 * counter — and hls.js never retries a 4xx itself, so a missing segment was a
 * tight loop against the cache for as long as the tab stayed open. Every
 * fatal media error called `recoverMediaError()` with no counter, and the
 * remaining error types tore the player down without ever showing the error
 * overlay: a frozen picture with no message.
 *
 * One budget per player instance, spent in this order:
 * - a fatal NETWORK_ERROR with 403/410 (the cache refused the signed link, or
 *   it expired) → ask the API for a fresh link ONCE; the same link again, or
 *   a 403/410 on the fresh one, is terminal ("link");
 * - any other fatal NETWORK_ERROR → `startLoad()` at most MAX_START_LOADS
 *   times, each after a growing pause, then terminal ("network");
 * - a fatal MEDIA_ERROR → `recoverMediaError()` at most MAX_MEDIA_RECOVERIES
 *   times (hls.js's own recipe: swap the audio codec before the second try),
 *   then terminal ("media");
 * - anything else fatal → terminal ("other");
 * - a non-fatal error → nothing, hls.js handles it.
 *
 * Pure: nothing from hls.js or the DOM is imported at runtime (the string
 * values of hls.js's ErrorTypes are matched directly), so the decision table
 * runs on Node's own test runner like the other lib/streaming tests.
 */

/** hls.js `ErrorTypes.NETWORK_ERROR` — matched by value, see the header. */
export const NETWORK_ERROR = "networkError";
/** hls.js `ErrorTypes.MEDIA_ERROR` — matched by value, see the header. */
export const MEDIA_ERROR = "mediaError";

/** How many times a fatal network error may restart loading per player instance. */
export const MAX_START_LOADS = 3;
/** How many times a fatal media error may be recovered per player instance. */
export const MAX_MEDIA_RECOVERIES = 2;
/**
 * The pause before the n-th `startLoad()`. An immediate restart on a missing
 * segment is the tight loop this file exists to stop; a growing pause also
 * gives a restarting cache a moment to come back.
 */
export const START_LOAD_DELAYS_MS: readonly number[] = [1000, 1500, 2000];

/** Why playback ended for good — picks the sentence under the error overlay. */
export type PlaybackFailure = "link" | "network" | "media" | "other";

/** The slice of hls.js's ErrorData the decision needs. */
export interface RecoveryError {
  fatal: boolean;
  /** `ErrorData.type` — one of hls.js's ErrorTypes values. */
  type: string;
  /** `ErrorData.response.code` — the HTTP status of the failed request, when one came back. */
  status?: number;
}

/** What this player instance has already spent. */
export interface RecoveryCounts {
  startLoads: number;
  mediaRecoveries: number;
  linkRefetches: number;
}

export const INITIAL_COUNTS: RecoveryCounts = Object.freeze({
  startLoads: 0,
  mediaRecoveries: 0,
  linkRefetches: 0,
});

export type RecoveryDecision =
  /** Not fatal — hls.js is dealing with it. */
  | { action: "ignore" }
  /** `hls.startLoad()` after this pause. */
  | { action: "startLoad"; delayMs: number }
  /** `hls.recoverMediaError()`, preceded by `hls.swapAudioCodec()` when asked. */
  | { action: "recoverMediaError"; swapAudioCodec: boolean }
  /** Remember the position and ask the API for a fresh signed link. */
  | { action: "refetchStream" }
  /** Tear the player down and show the error overlay. */
  | { action: "fail"; reason: PlaybackFailure };

export interface RecoveryStep {
  decision: RecoveryDecision;
  /** The counts after this decision — hand them to the next call. */
  counts: RecoveryCounts;
}

const IGNORE: RecoveryDecision = { action: "ignore" };

function fail(reason: PlaybackFailure): RecoveryDecision {
  return { action: "fail", reason };
}

/**
 * The decision table, as a pure function of the error and what has been
 * spent so far. `createRecoveryBudget()` below keeps the counts for a
 * player instance; this is the part the tests exercise row by row.
 */
export function decideRecovery(error: RecoveryError, counts: RecoveryCounts): RecoveryStep {
  if (!error.fatal) return { decision: IGNORE, counts };

  switch (error.type) {
    case NETWORK_ERROR: {
      // 403/410 come from the cache server's token check: re-requesting the
      // same URL can never succeed, only a fresh link can.
      if (error.status === 403 || error.status === 410) {
        if (counts.linkRefetches >= 1) return { decision: fail("link"), counts };
        return {
          decision: { action: "refetchStream" },
          counts: { ...counts, linkRefetches: counts.linkRefetches + 1 },
        };
      }
      if (counts.startLoads >= MAX_START_LOADS) return { decision: fail("network"), counts };
      const delayMs = START_LOAD_DELAYS_MS[Math.min(counts.startLoads, START_LOAD_DELAYS_MS.length - 1)];
      return {
        decision: { action: "startLoad", delayMs },
        counts: { ...counts, startLoads: counts.startLoads + 1 },
      };
    }
    case MEDIA_ERROR: {
      if (counts.mediaRecoveries >= MAX_MEDIA_RECOVERIES) return { decision: fail("media"), counts };
      return {
        decision: { action: "recoverMediaError", swapAudioCodec: counts.mediaRecoveries >= 1 },
        counts: { ...counts, mediaRecoveries: counts.mediaRecoveries + 1 },
      };
    }
    default:
      // Key-system, mux and "other" errors: nothing here can mend them.
      return { decision: fail("other"), counts };
  }
}

/** The budget of one player instance — built fresh with every hls.js instance. */
export interface RecoveryBudget {
  decide(error: RecoveryError): RecoveryDecision;
  readonly counts: RecoveryCounts;
}

export function createRecoveryBudget(): RecoveryBudget {
  let counts = INITIAL_COUNTS;
  return {
    decide(error) {
      const step = decideRecovery(error, counts);
      counts = step.counts;
      return step.decision;
    },
    get counts() {
      return counts;
    },
  };
}

// ── The one fresh link ────────────────────────────────────────────────────

/** The slice of React Query's QueryClient the fresh-link request needs. */
export interface StreamQueryClient {
  invalidateQueries(filters: { queryKey: readonly unknown[] }): Promise<unknown>;
  getQueryData(queryKey: readonly unknown[]): unknown;
}

/**
 * The fresh-link attempt both engines share (a `refetchStream` decision
 * above). Invalidating the stream query refetches it; resolves true when a
 * DIFFERENT link came back — the player effect keyed on the URL then
 * rebuilds from the remembered position — and false when the same link came
 * back (a 403 that is not an expiry) or the refetch itself failed (lapsed
 * subscription, API down: React Query keeps the old data, so the URL is
 * unchanged). False is terminal for the caller: stop and show the overlay.
 */
export async function requestFreshLink(
  client: StreamQueryClient,
  queryKey: readonly unknown[],
  currentUrl: string,
): Promise<boolean> {
  await client.invalidateQueries({ queryKey });
  const fresh = client.getQueryData(queryKey) as { playlistUrl?: string } | null | undefined;
  return Boolean(fresh?.playlistUrl && fresh.playlistUrl !== currentUrl);
}

// ── Safari's native HLS engine ────────────────────────────────────────────
// On that path there is no hls.js to report through: the <video> element
// itself fires `error` with a MediaError code (audit STR-010). The same
// one-shot fresh link applies; everything else is terminal at once because
// the native engine has already given up by the time the event fires.

/** `MediaError.code` values — spelled out so this file needs no DOM lib at runtime. */
export const MEDIA_ERR_ABORTED = 1;
export const MEDIA_ERR_NETWORK = 2;
export const MEDIA_ERR_DECODE = 3;
export const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

export type NativeDecision =
  | { action: "ignore" }
  | { action: "refetchStream" }
  | { action: "fail"; reason: PlaybackFailure };

/**
 * @param code `video.error?.code` — undefined when the element carries no
 *   MediaError, in which case there is nothing to act on.
 * @param linkRefetched whether this element already had its one fresh link.
 */
export function decideNativeError(code: number | undefined, linkRefetched: boolean): NativeDecision {
  switch (code) {
    case undefined:
    // The element was told to stop (a source swap, the page leaving): not a failure.
    case MEDIA_ERR_ABORTED:
      return { action: "ignore" };
    // An expired or refused signed link surfaces as either of these on the
    // native engine (it does not say which status the cache answered).
    case MEDIA_ERR_NETWORK:
    case MEDIA_ERR_SRC_NOT_SUPPORTED:
      return linkRefetched ? { action: "fail", reason: "link" } : { action: "refetchStream" };
    case MEDIA_ERR_DECODE:
      return { action: "fail", reason: "media" };
    default:
      return { action: "fail", reason: "other" };
  }
}
