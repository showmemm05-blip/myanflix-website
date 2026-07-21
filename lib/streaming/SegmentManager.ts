import Hls from "hls.js";
import type { SegmentMeta } from "./types";

/**
 * Derives the ordered segment list (with absolute start/end times) for
 * whichever HLS rendition is currently active. Reuses hls.js's own parsed
 * playlist (`level.details.fragments`) instead of re-parsing the .m3u8
 * ourselves, so it always agrees with what hls.js is actually playing —
 * including staying in sync across ABR quality switches, which swap in a
 * completely different segment URL set.
 */
export class SegmentManager {
  private hls: Hls;
  private segments: SegmentMeta[] = [];
  private listeners = new Set<(segments: SegmentMeta[]) => void>();

  constructor(hls: Hls) {
    this.hls = hls;
    this.rebuild = this.rebuild.bind(this);
    this.hls.on(Hls.Events.LEVEL_UPDATED, this.rebuild);
    this.hls.on(Hls.Events.LEVEL_SWITCHED, this.rebuild);
  }

  private rebuild(): void {
    const level = this.hls.levels[this.hls.currentLevel];
    const fragments = level?.details?.fragments ?? [];
    this.segments = fragments.map((frag, index) => ({
      index: typeof frag.sn === "number" ? frag.sn : index,
      url: frag.url,
      startTime: frag.start,
      endTime: frag.start + frag.duration,
      duration: frag.duration,
    }));
    this.listeners.forEach((listener) => listener(this.segments));
  }

  onUpdate(listener: (segments: SegmentMeta[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSegments(): SegmentMeta[] {
    return this.segments;
  }

  /** Every segment that overlaps [startSeconds, endSeconds]. */
  getSegmentsInRange(startSeconds: number, endSeconds: number): SegmentMeta[] {
    const from = Math.max(0, startSeconds);
    return this.segments.filter((segment) => segment.endTime > from && segment.startTime < endSeconds);
  }

  destroy(): void {
    this.hls.off(Hls.Events.LEVEL_UPDATED, this.rebuild);
    this.hls.off(Hls.Events.LEVEL_SWITCHED, this.rebuild);
    this.listeners.clear();
  }
}
