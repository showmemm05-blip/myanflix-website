/**
 * The name the quality menu shows for one hls.js level.
 *
 * The encoders name each rung after its ladder step (`1080p/`, `720p/`, …),
 * and since 2026-10-12 a widescreen film's 1080p rung is only 800 pixels
 * tall (the picture is scaled to FIT the 1920×1080 box, bars already cut).
 * Labelling by pixel height would therefore show "800p" for what the
 * admin, the phone app and the viewer all know as 1080p — so the folder
 * name wins, and the height is only the fallback for a playlist that was
 * not produced by our encoders.
 */
const RUNG_IN_URI = /(?:^|\/)(\d{3,4}p)\/[^/?#]*\.m3u8(?:[?#]|$)/;

/** The slice of an hls.js `Level` this needs; `url` is a string or a list in different hls.js versions. */
export interface LevelLike {
  height: number;
  url?: string | string[];
  uri?: string;
}

export function qualityLabel(level: LevelLike): string {
  const candidates = Array.isArray(level.url) ? [...level.url, level.uri] : [level.url, level.uri];
  for (const candidate of candidates) {
    const match = typeof candidate === "string" ? RUNG_IN_URI.exec(candidate) : null;
    if (match) return match[1];
  }
  return `${level.height}p`;
}
