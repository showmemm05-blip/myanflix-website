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
  small: "clamp(0.8rem, 1.6vw, 1.05rem)",
  medium: "clamp(0.95rem, 2.2vw, 1.4rem)",
  large: "clamp(1.15rem, 3vw, 1.9rem)",
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
  if (lines.length === 0) return null;

  return (
    <div
      aria-live="off"
      className={cn(
        "pointer-events-none absolute inset-x-0 z-[5] flex justify-center px-4",
        "transition-[bottom] duration-300 ease-out",
      )}
      style={{ bottom: liftForControls ? "clamp(4.25rem, 16%, 7.5rem)" : "clamp(0.75rem, 5%, 2.5rem)" }}
    >
      <div
        className={cn(
          // 60ch caps the measure so a long sentence wraps into readable
          // lines instead of one edge-to-edge strip.
          "max-w-[min(92%,60ch)] text-center font-medium text-white",
          "whitespace-pre-line [overflow-wrap:anywhere]",
          style.background
            ? "rounded-lg bg-black/75 px-3 py-1.5 backdrop-blur-[2px]"
            : "[text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_0_8px_rgba(0,0,0,0.7)]",
        )}
        style={{ fontSize: FONT_SIZE[style.size], lineHeight: 1.35 }}
      >
        {lines.join("\n")}
      </div>
    </div>
  );
}
