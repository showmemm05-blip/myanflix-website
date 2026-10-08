"use client";

import { cn } from "@/lib/utils";

/**
 * CUSTOM SUBTITLE RENDERING — why the browser doesn't paint these.
 *
 * The native cue renderer draws inside the <video> box with almost nothing
 * adjustable: `::cue` may recolor text but cannot move it, size it per-user,
 * or wrap it inside a chosen width, and its bottom-anchored default lands
 * exactly under our own control bar. So the player keeps every TextTrack in
 * `hidden` mode — cues still load and fire `cuechange`, the browser just
 * paints nothing — and this overlay renders the active cues as ordinary HTML.
 * Wrapping, position, size and background all become plain CSS, and the
 * caption lifts out of the way whenever the control bar is showing.
 */

export type SubtitleSize = "small" | "medium" | "large";

export interface SubtitleStyleSettings {
  size: SubtitleSize;
  /** Solid backing plate behind the text vs bare text with a shadow. */
  background: boolean;
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyleSettings = {
  size: "medium",
  background: true,
};

const STORAGE_KEY = "myanflix-subtitle-style";

export function loadSubtitleStyle(): SubtitleStyleSettings {
  if (typeof window === "undefined") return DEFAULT_SUBTITLE_STYLE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SUBTITLE_STYLE;
    const parsed = JSON.parse(raw) as Partial<SubtitleStyleSettings>;
    return {
      size: parsed.size === "small" || parsed.size === "large" ? parsed.size : "medium",
      background: parsed.background !== false,
    };
  } catch {
    return DEFAULT_SUBTITLE_STYLE;
  }
}

export function saveSubtitleStyle(style: SubtitleStyleSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
  } catch {
    // Storage full/blocked — the choice simply doesn't survive a reload.
  }
}

/**
 * Viewport-relative with hard bounds, so captions track the video size
 * between a phone and a fullscreen desktop without ever collapsing to
 * unreadable or ballooning over the picture.
 */
const FONT_SIZE: Record<SubtitleSize, string> = {
  small: "clamp(14px, 1.25vw, 18px)",
  medium: "clamp(15px, 1.67vw, 24px)",
  large: "clamp(17px, 2.1vw, 30px)",
};

export function SubtitleOverlay({
  lines,
  style,
  liftForControls,
}: {
  /** The active cues' text, tags stripped; one entry per simultaneous cue. */
  lines: string[];
  style: SubtitleStyleSettings;
  /** True while the control bar is showing — the caption steps up out of its way. */
  liftForControls: boolean;
}) {
  // One row per caption line (a cue's own line breaks included). Each row gets
  // its own backing plate as a BLOCK, not one inline span wrapping every line:
  // Noto Sans Myanmar has very tall ascent/descent metrics, so an inline
  // background is far taller than the 1.5 line height and each line's plate
  // covered the line above it (owner report, 2026-10-07). A block plate is
  // exactly as tall as its line box, and the gap keeps the plates apart.
  const rows = lines.flatMap((line) => line.split("\n")).map((row) => row.trim()).filter(Boolean);
  if (rows.length === 0) return null;

  return (
    <div
      aria-live="off"
      className={cn(
        "pointer-events-none absolute inset-x-[8%] z-[5] flex justify-center",
        "transition-[bottom] duration-300 ease-out",
      )}
      // Clears the scrub bar and control row while they show (Player.dc.html: 136px
      // over a full window), and sits low on the picture once they fade.
      style={{ bottom: liftForControls ? "clamp(96px, 18%, 136px)" : "clamp(16px, 6%, 48px)" }}
    >
      <div
        className={cn(
          // 60ch caps the measure so a long sentence wraps into readable
          // lines instead of one edge-to-edge strip.
          "flex max-w-[60ch] flex-col items-center gap-1 text-center font-semibold text-fg",
          !style.background && "[text-shadow:0_1px_3px_rgba(0,0,0,0.9)]",
        )}
        style={{ fontSize: FONT_SIZE[style.size], lineHeight: 1.5 }}
      >
        {rows.map((row, index) => (
          <p
            // Rows are re-rendered wholesale on every cue change; position is the identity.
            key={index}
            className={cn(
              "m-0 max-w-full [overflow-wrap:anywhere]",
              style.background && "rounded-[6px] bg-black/62 px-3 py-0.5",
            )}
          >
            {row}
          </p>
        ))}
      </div>
    </div>
  );
}
