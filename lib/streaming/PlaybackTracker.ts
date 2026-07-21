interface PlaybackTrackerHandlers {
  /** Fired at most once per second while playback advances normally. */
  onPositionChange: (currentTime: number) => void;
  /** Fired once a seek (user scrub, skip ±10s, etc.) settles. */
  onSeek: (currentTime: number) => void;
}

const POSITION_REPORT_THRESHOLD_SECONDS = 1;

/**
 * Thin wrapper around a <video> element that turns its native `timeupdate`/
 * `seeked` events into the two signals PrefetchManager actually cares about:
 * "playback moved forward a bit" vs "playback jumped". Keeping this as its
 * own component means the prefetch logic never touches the DOM directly.
 */
export class PlaybackTracker {
  private video: HTMLVideoElement;
  private handlers: PlaybackTrackerHandlers;
  private lastReported = -1;

  constructor(video: HTMLVideoElement, handlers: PlaybackTrackerHandlers) {
    this.video = video;
    this.handlers = handlers;
    this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
    this.handleSeeked = this.handleSeeked.bind(this);
    this.video.addEventListener("timeupdate", this.handleTimeUpdate);
    this.video.addEventListener("seeked", this.handleSeeked);
  }

  private handleTimeUpdate(): void {
    const time = this.video.currentTime;
    if (Math.abs(time - this.lastReported) < POSITION_REPORT_THRESHOLD_SECONDS) return;
    this.lastReported = time;
    this.handlers.onPositionChange(time);
  }

  private handleSeeked(): void {
    this.lastReported = this.video.currentTime;
    this.handlers.onSeek(this.video.currentTime);
  }

  destroy(): void {
    this.video.removeEventListener("timeupdate", this.handleTimeUpdate);
    this.video.removeEventListener("seeked", this.handleSeeked);
  }
}
