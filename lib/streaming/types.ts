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
}

/** Sliding window, in seconds, around the current playback position that should stay cached. */
export interface PrefetchWindowConfig {
  beforeSeconds: number;
  afterSeconds: number;
}
