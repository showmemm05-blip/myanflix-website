"use client";

import { useEffect, useRef } from "react";

export interface PlayerHotkeyHandlers {
  onTogglePlay: () => void;
  /** Negative seeks backwards. */
  onSeekBy: (deltaSeconds: number) => void;
  /** 0–1 of the total duration, for the number-row jump keys. */
  onSeekToFraction: (fraction: number) => void;
  /** Delta in whole percentage points of the 0–100 volume scale. */
  onVolumeBy: (delta: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onToggleTheater: () => void;
  onNextEpisode?: () => void;
}

const NUDGE_SECONDS = 5;
const JUMP_SECONDS = 10;
const VOLUME_STEP = 5;

/**
 * A keystroke aimed at a text field, an open menu, or a focused slider belongs
 * to that control, not to playback — hijacking it would make the search box
 * unusable and break the scrubber's own arrow-key handling.
 */
function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest('[role="menu"],[role="dialog"],[role="slider"],[contenteditable="true"]'));
}

/**
 * The standard streaming-player keymap (space/k, j/l, arrows, m, f, t, n, 0–9),
 * bound at the document so the shortcuts work without the user first having to
 * click the video to focus it — which is exactly the friction that makes most
 * web players feel worse than a native one.
 *
 * Handlers are read through a ref so a parent re-render (which happens on every
 * `timeupdate`) never detaches and re-attaches the listener.
 */
export function usePlayerHotkeys(enabled: boolean, handlers: PlayerHotkeyHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditingTarget(event.target)) return;

      const h = handlersRef.current;
      const key = event.key;

      // Digits jump to that tenth of the runtime — 3 → 30%.
      if (key >= "0" && key <= "9") {
        event.preventDefault();
        h.onSeekToFraction(Number(key) / 10);
        return;
      }

      switch (key.toLowerCase()) {
        case " ":
        case "k":
          event.preventDefault();
          h.onTogglePlay();
          break;
        case "arrowleft":
          event.preventDefault();
          h.onSeekBy(-NUDGE_SECONDS);
          break;
        case "arrowright":
          event.preventDefault();
          h.onSeekBy(NUDGE_SECONDS);
          break;
        case "j":
          event.preventDefault();
          h.onSeekBy(-JUMP_SECONDS);
          break;
        case "l":
          event.preventDefault();
          h.onSeekBy(JUMP_SECONDS);
          break;
        case "arrowup":
          event.preventDefault();
          h.onVolumeBy(VOLUME_STEP);
          break;
        case "arrowdown":
          event.preventDefault();
          h.onVolumeBy(-VOLUME_STEP);
          break;
        case "m":
          event.preventDefault();
          h.onToggleMute();
          break;
        case "f":
          event.preventDefault();
          h.onToggleFullscreen();
          break;
        case "t":
          event.preventDefault();
          h.onToggleTheater();
          break;
        case "n":
          if (!h.onNextEpisode) break;
          event.preventDefault();
          h.onNextEpisode();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
