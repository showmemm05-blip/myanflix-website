"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLanguage } from "@/lib/context/language-context";
import { formatTimecode } from "@/lib/format";
import { cn } from "@/lib/utils";

const ARROW_STEP_SECONDS = 5;
const PAGE_STEP_SECONDS = 60;

interface ScrubBarProps {
  currentTime: number;
  duration: number;
  /** Real `<video>.buffered` ranges, in seconds. */
  bufferedRanges: [number, number][];
  onSeek: (seconds: number) => void;
  /** Lets the parent pin the controls open for the whole drag. */
  onScrubbingChange?: (scrubbing: boolean) => void;
  className?: string;
}

/**
 * Purpose-built rather than the shared `Slider`, because a seek bar needs three
 * things a generic slider has no concept of: buffered ranges painted behind the
 * played portion, a time chip that follows the pointer before you commit to a
 * seek, and a track that thickens on approach so the hit target grows exactly
 * when the user is reaching for it.
 */
export function ScrubBar({
  currentTime,
  duration,
  bufferedRanges,
  onSeek,
  onScrubbingChange,
  className,
}: ScrubBarProps) {
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const playedFraction = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const asPercent = (seconds: number) => (duration > 0 ? Math.min(100, (seconds / duration) * 100) : 0);

  const fractionFromEvent = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const setScrubbing = (scrubbing: boolean) => {
    setIsScrubbing(scrubbing);
    onScrubbingChange?.(scrubbing);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setScrubbing(true);
    const fraction = fractionFromEvent(event.clientX);
    setHoverFraction(fraction);
    onSeek(fraction * duration);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const fraction = fractionFromEvent(event.clientX);
    setHoverFraction(fraction);
    if (isScrubbing) onSeek(fraction * duration);
  };

  const endScrub = (event: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setScrubbing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const seekTo = (seconds: number) => {
      event.preventDefault();
      onSeek(Math.min(duration, Math.max(0, seconds)));
    };
    switch (event.key) {
      case "ArrowLeft":
        seekTo(currentTime - ARROW_STEP_SECONDS);
        break;
      case "ArrowRight":
        seekTo(currentTime + ARROW_STEP_SECONDS);
        break;
      case "PageDown":
        seekTo(currentTime - PAGE_STEP_SECONDS);
        break;
      case "PageUp":
        seekTo(currentTime + PAGE_STEP_SECONDS);
        break;
      case "Home":
        seekTo(0);
        break;
      case "End":
        seekTo(duration);
        break;
      default:
        break;
    }
  };

  const showChip = hoverFraction !== null && duration > 0;

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t.player.controls.seek}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      // Timecodes only — the same "elapsed / total" the bar shows visually, so it needs
      // no translated connective word.
      aria-valuetext={`${formatTimecode(currentTime)} / ${formatTimecode(duration)}`}
      data-scrubbing={isScrubbing}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endScrub}
      onPointerCancel={endScrub}
      onPointerLeave={() => {
        if (!isScrubbing) setHoverFraction(null);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative flex h-5 w-full cursor-pointer touch-none items-center outline-none select-none",
        // The seek bar is the most-reached-for control on the player, and a 20px band is
        // well under a thumb. The pseudo-element grows the pointer target to ~42px —
        // mostly upward, into the empty gradient above, so the transport row's own
        // buttons keep every pixel of theirs — while the painted bar stays hairline thin.
        "before:absolute before:inset-x-0 before:-top-4 before:-bottom-1.5 before:content-['']",
        className,
      )}
    >
      {showChip && (
        <div
          className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-semibold text-white tabular-nums shadow-e2 ring-1 ring-white/15 backdrop-blur-xl ring-inset"
          style={{ left: `${hoverFraction * 100}%` }}
        >
          {formatTimecode(hoverFraction * duration)}
        </div>
      )}

      <div
        ref={trackRef}
        className="relative h-1 w-full overflow-hidden rounded-full bg-white/25 transition-[height] duration-150 ease-out group-hover:h-[6px] group-focus-visible:h-[6px] group-data-[scrubbing=true]:h-[6px]"
      >
        {bufferedRanges.map(([start, end], index) => (
          <div
            key={index}
            className="absolute inset-y-0 rounded-full bg-white/40"
            style={{ left: `${asPercent(start)}%`, width: `${Math.max(0, asPercent(end) - asPercent(start))}%` }}
          />
        ))}

        {/* Where the pointer currently sits, so the destination reads before committing. */}
        {showChip && !isScrubbing && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/25"
            style={{ width: `${hoverFraction * 100}%` }}
          />
        )}

        {/* Violet is the action colour everywhere else in the app; here it is
            literally the progress of the action being taken. */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary shadow-[0_0_12px_-2px_var(--primary)]"
          style={{ width: `${playedFraction * 100}%` }}
        />
      </div>

      <div
        className="pointer-events-none absolute size-3.5 -translate-x-1/2 scale-0 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_2px_10px_rgba(0,0,0,0.55)] transition-transform duration-150 ease-out group-hover:scale-100 group-focus-visible:scale-100 group-data-[scrubbing=true]:scale-110"
        style={{ left: `${playedFraction * 100}%` }}
      />
    </div>
  );
}
