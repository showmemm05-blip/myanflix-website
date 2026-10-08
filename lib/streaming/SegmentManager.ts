import Hls, { type FragLoadingData } from "hls.js";
import type { SegmentMeta } from "./types";

/** `PlaylistLevelType.MAIN` as a literal (an ambient const enum in hls.js — see HlsCacheLoader). */
const MAIN_FRAGMENT_TYPE = "main";

/**
 * Derives the ordered segment list (with absolute start/end times) for the
 * HLS rendition hls.js is LOADING (`hls.loadLevel`), which during a quality
 * switch runs ahead of the one still playing (`hls.currentLevel` only moves at
 * LEVEL_SWITCHED, once the new quality reaches the screen). Following the
 * loading level means the look-ahead prefetch fetches the quality hls.js will
 * actually ask for next. Reuses hls.js's own parsed playlist
 * (`level.details.fragments`) instead of re-parsing the .m3u8 ourselves.
 */
export class SegmentManager {
  private hls: Hls;
  private segments: SegmentMeta[] = [];
  /**
   * Where hls.js started fetching a quality that is not on screen yet (start
   * time of the newest main fragment it asked for in that quality), or null
   * when it is loading the quality that is playing. hls.js keeps the stretch
   * before that point buffered in the old quality and never asks for it
   * again, so the look-ahead skips it (see `lookAheadStart`).
   */
  private switchStart: number | null = null;

  constructor(hls: Hls) {
    this.hls = hls;
    this.rebuild = this.rebuild.bind(this);
    this.onFragLoading = this.onFragLoading.bind(this);
    this.onLevelSwitched = this.onLevelSwitched.bind(this);
    this.hls.on(Hls.Events.LEVEL_SWITCHING, this.rebuild);
    this.hls.on(Hls.Events.LEVEL_UPDATED, this.rebuild);
    this.hls.on(Hls.Events.LEVEL_SWITCHED, this.onLevelSwitched);
    this.hls.on(Hls.Events.FRAG_LOADING, this.onFragLoading);
  }

  private onLevelSwitched(): void {
    // The new quality is on screen: everything ahead of the playhead is now
    // fetched in it, so the look-ahead starts at the playhead again.
    this.switchStart = null;
    this.rebuild();
  }

  private onFragLoading(_event: string, data: FragLoadingData): void {
    const frag = data.frag;
    // Subtitle pieces and hls.js's start-up speed test are not buffered video.
    if ((frag.type as string) !== MAIN_FRAGMENT_TYPE || frag.bitrateTest) return;
    this.switchStart = frag.level !== this.hls.currentLevel ? frag.start : null;
  }

  private rebuild(): void {
    const loading = this.hls.loadLevel;
    const level = this.hls.levels[loading >= 0 ? loading : this.hls.currentLevel];
    // A quality hls.js has not fetched the playlist for yet has no fragments:
    // keep the old list until that playlist arrives (LEVEL_UPDATED) rather
    // than emptying the window and throwing the whole cache away meanwhile.
    const fragments = level?.details?.fragments;
    if (!fragments) return;
    this.segments = fragments.map((frag, index) => ({
      index: typeof frag.sn === "number" ? frag.sn : index,
      url: frag.url,
      startTime: frag.start,
      endTime: frag.start + frag.duration,
      duration: frag.duration,
    }));
  }

  /**
   * Where the look-ahead prefetch should begin: the playhead, or — while a
   * quality switch is still on its way to the screen — the point where hls.js
   * started fetching the new quality, so we don't download a new-quality copy
   * of video hls.js already holds in the old quality.
   */
  lookAheadStart(currentTime: number): number {
    return this.switchStart === null ? currentTime : Math.max(currentTime, this.switchStart);
  }

  /** Forget the switch point after a seek; hls.js reports where it loads next on its following fragment. */
  resetLoadPosition(): void {
    this.switchStart = null;
  }

  /** Every segment that overlaps [startSeconds, endSeconds]. */
  getSegmentsInRange(startSeconds: number, endSeconds: number): SegmentMeta[] {
    const from = Math.max(0, startSeconds);
    return this.segments.filter((segment) => segment.endTime > from && segment.startTime < endSeconds);
  }

  destroy(): void {
    this.hls.off(Hls.Events.LEVEL_SWITCHING, this.rebuild);
    this.hls.off(Hls.Events.LEVEL_UPDATED, this.rebuild);
    this.hls.off(Hls.Events.LEVEL_SWITCHED, this.onLevelSwitched);
    this.hls.off(Hls.Events.FRAG_LOADING, this.onFragLoading);
  }
}
