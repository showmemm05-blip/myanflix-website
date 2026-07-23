/** A single HLS media segment (.ts file) belonging to the currently active rendition. */
export interface SegmentMeta {
  index: number;
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export type DownloadStatus = "idle" | "queued" | "downloading" | "downloaded" | "failed" | "cancelled";

/** What CacheManager tracks per segment: the requested metadata plus its current download/cache lifecycle state. */
export interface CacheEntry {
  segment: SegmentMeta;
  status: DownloadStatus;
  data: ArrayBuffer | null;
  lastAccessed: number;
  /** Real wall-clock time the network fetch took, recorded once at download completion — replayed to hls.js's bandwidth estimator on cache hits so prefetched segments don't look like instant/infinite-bandwidth downloads. */
  downloadDurationMs: number | null;
}

/** Sliding window, in seconds, around the current playback position that should stay cached. */
export interface PrefetchWindowConfig {
  beforeSeconds: number;
  afterSeconds: number;
}
