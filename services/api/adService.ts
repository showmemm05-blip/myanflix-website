import { apiClient, API_ORIGIN, type RequestSignalOptions } from "./apiClient";
import { PREROLL_DECISION_TIMEOUT_MS, type AdPlaybackEvent, type PrerollAd } from "@/lib/player/preroll";
import { MIDROLL_DECISION_TIMEOUT_MS, type MidrollPlanInput } from "@/lib/player/midroll";
import { safeAdLink } from "@/lib/player/corner";

/** One MP4 ad — before the movie (pre-roll) or at a break (mid-roll); the same shape for both. */
export type VideoAd = PrerollAd;

/** The mid-roll plan for this viewing (lib/player/midroll.ts takes it as is). */
export interface BreakPlan extends MidrollPlanInput {
  endGuardSeconds: number;
  askAheadSeconds: number;
}

/** The corner picture for this viewing (lib/player/corner.ts takes its timing). */
export interface CornerAd {
  /** One impression row per viewing — every corner event goes to it. */
  playbackId: string;
  advertisementId: string;
  title: string;
  /** Public picture (PNG / JPG / WebP / GIF), absolute. */
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** A plain http(s) address, or null (safeAdLink has checked it). */
  linkUrl: string | null;
  /** Seconds visible per showing; null = until the viewer closes it. */
  showSeconds: number | null;
  /** Seconds WATCHED after it leaves before it comes back; null = once. */
  repeatSeconds: number | null;
  closable: boolean;
  firstShowAfterSeconds: number;
}

/**
 * `POST /ads/session`: everything advertising needs for one open of a title.
 * Each part may be null — no ad before the movie, no breaks, no corner
 * picture this viewing. The ad before the movie comes on every open.
 */
export interface AdSession {
  preroll: VideoAd | null;
  breaks: BreakPlan | null;
  corner: CornerAd | null;
}

/** What the player reports: the video-ad events, plus a corner coming back (`shown`) and a tap on its link (`clicked`). */
export type AdEventName = AdPlaybackEvent | "shown" | "clicked";

export interface AdPlaybackEventResult {
  playbackId: string;
  status: string;
}

/**
 * Signed links and pictures are normally absolute (the cache server's host);
 * a relative one is resolved against the API origin, as the stream link is.
 */
function absoluteUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_ORIGIN}${url}`;
}

function withAbsoluteVideo(ad: VideoAd | null | undefined): VideoAd | null {
  if (!ad?.videoUrl) return null;
  return { ...ad, videoUrl: absoluteUrl(ad.videoUrl) };
}

/** A corner with no picture shows nothing, and a link that is not plain http(s) is never opened. */
function cleanCorner(corner: CornerAd | null | undefined): CornerAd | null {
  if (!corner?.imageUrl) return null;
  return { ...corner, imageUrl: absoluteUrl(corner.imageUrl), linkUrl: safeAdLink(corner.linkUrl) };
}

export const adService = {
  /**
   * Asks the backend, once per open of a title, what advertising this
   * viewing carries: the ad before the movie, the break plan, the corner
   * picture. The decision is made there (schedule, targets, caps, priority,
   * who sees ads during the movie) — the player only shows what comes back.
   * A slow answer must not hold the title: the request gives up after 4 s,
   * and any error at all is the caller's "no ads". Members-only (JWT); 404
   * for a hidden title.
   */
  async getSession(movieId: string, options: RequestSignalOptions = {}): Promise<AdSession> {
    const session = await apiClient.post<Partial<AdSession> | null>(
      "/ads/session",
      { movieId },
      { timeout: PREROLL_DECISION_TIMEOUT_MS, signal: options.signal },
    );
    return {
      preroll: withAbsoluteVideo(session?.preroll),
      breaks: session?.breaks ?? null,
      corner: cleanCorner(session?.corner),
    };
  },

  /**
   * The ad for one break (`breakAtSeconds` = k × interval), asked a little
   * before the break so only this small answer is in flight — the MP4
   * itself loads when the break starts. Null when nothing plays there (ads
   * off, the break already played for this viewer, no ad eligible). Gives up
   * after 4 s like the session; the caller treats any error as null.
   */
  async getMidroll(movieId: string, breakAtSeconds: number, options: RequestSignalOptions = {}): Promise<VideoAd | null> {
    const decision = await apiClient.post<{ ad: VideoAd | null } | null>(
      "/ads/midroll",
      { movieId, breakAtSeconds },
      { timeout: MIDROLL_DECISION_TIMEOUT_MS, signal: options.signal },
    );
    return withAbsoluteVideo(decision?.ad);
  },

  /**
   * Reports what happened to one play. `started` is the impression;
   * `completed` / `skipped` / `failed` close a video ad. A corner picture
   * sends `shown` each time it comes back, `clicked` per tap of its link and
   * `skipped` when the viewer closes it. The backend ignores repeats and
   * out-of-order events, so this is fire-and-forget from the player.
   */
  sendPlaybackEvent(playbackId: string, event: AdEventName, positionSeconds?: number): Promise<AdPlaybackEventResult> {
    return apiClient.post<AdPlaybackEventResult>(`/ads/playbacks/${encodeURIComponent(playbackId)}/events`, {
      event,
      ...(positionSeconds === undefined ? {} : { positionSeconds }),
    });
  },
};
