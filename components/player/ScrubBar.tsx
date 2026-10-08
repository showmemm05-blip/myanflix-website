"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLanguage } from "@/lib/context/language-context";
import { formatTimecode } from "@/lib/format";
import { cn } from "@/lib/utils";

const ARROW_STEP_SECONDS = 5;
const PAGE_STEP_SECONDS = 60;
/**
 * While dragging, seek at most this often (about 4 a second). Every seek makes
 * the player abort the segment it was loading and fetch a new one, so seeking
 * on every pointer move (up to 60 a second) burned mobile data for nothing.
 * The thumb and time chip still follow the pointer on every move, and the
 * last position is always committed when the drag ends.
 */
const DRAG_SEEK_INTERVAL_MS = 250;

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

  // Drag-seek throttle state. The latest onSeek is kept in a ref so a trailing
  // seek fired from a timer never calls a stale callback.
  const onSeekRef = useRef(onSeek);
  const lastDragSeekAtRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);
  const dragSeekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    onSeekRef.current = onSeek;
  }, [onSeek]);
  useEffect(() => {
    return () => {
      if (dragSeekTimerRef.current) clearTimeout(dragSeekTimerRef.current);
    };
  }, []);

  const flushDragSeek = () => {
    if (dragSeekTimerRef.current) {
      clearTimeout(dragSeekTimerRef.current);
      dragSeekTimerRef.current = null;
    }
    const pending = pendingSeekRef.current;
    if (pending === null) return;
    pendingSeekRef.current = null;
    lastDragSeekAtRef.current = performance.now();
    onSeekRef.current(pending);
  };

  const queueDragSeek = (seconds: number) => {
    pendingSeekRef.current = seconds;
    if (dragSeekTimerRef.current) return;
    const wait = DRAG_SEEK_INTERVAL_MS - (performance.now() - lastDragSeekAtRef.current);
    if (wait <= 0) flushDragSeek();
    else dragSeekTimerRef.current = setTimeout(flushDragSeek, wait);
  };

  // While dragging, the thumb and fill follow the pointer itself rather than
  // the (throttled) playback position, so the bar never lags the finger.
  const shownTime = isScrubbing && hoverFraction !== null ? hoverFraction * duration : currentTime;
  const playedFraction = duration > 0 ? Math.min(1, Math.max(0, shownTime / duration)) : 0;
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
    pendingSeekRef.current = null;
    lastDragSeekAtRef.current = performance.now();
    onSeek(fraction * duration);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const fraction = fractionFromEvent(event.clientX);
    setHoverFraction(fraction);
    if (isScrubbing) queueDragSeek(fraction * duration);
  };

  const endScrub = (event: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    // Always land exactly where the drag ended.
    flushDragSeek();
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
        "group relative flex h-6 w-full cursor-pointer touch-none items-center rounded-full outline-none select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
        // The seek bar is the most-reached-for control on the player, and a 24px band is
        // under a thumb. The pseudo-element grows the pointer target upward, into the
        // empty scrim above, so the control row's own buttons keep every pixel of theirs —
        // while the painted bar stays hairline thin.
        "before:absolute before:inset-x-0 before:-top-3 before:-bottom-1 before:content-['']",
        className,
      )}
    >
      {showChip && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[26px] h-[26px] -translate-x-1/2 rounded-[8px] bg-art-badge px-2 text-[12px] leading-[26px] font-bold text-fg tabular-nums backdrop-blur-[14px]"
          style={{ left: `${hoverFraction * 100}%` }}
        >
          {formatTimecode(hoverFraction * duration)}
        </div>
      )}

      <div
        ref={trackRef}
        className="relative h-1 w-full overflow-hidden rounded-[3px] bg-white/24 transition-[height] duration-150 ease-out group-hover:h-[6px] group-focus-visible:h-[6px] group-data-[scrubbing=true]:h-[6px]"
      >
        {bufferedRanges.map(([start, end], index) => (
          <div
            key={index}
            className="absolute inset-y-0 bg-white/45"
            style={{ left: `${asPercent(start)}%`, width: `${Math.max(0, asPercent(end) - asPercent(start))}%` }}
          />
        ))}

        {/* Where the pointer currently sits, so the destination reads before committing. */}
        {showChip && !isScrubbing && (
          <div
            className="absolute inset-y-0 left-0 bg-white/20"
            style={{ width: `${hoverFraction * 100}%` }}
          />
        )}

        {/* Crimson is the progress colour everywhere in Marquee. */}
        <div
          className="absolute inset-y-0 left-0 rounded-[3px] bg-crimson"
          style={{ width: `${playedFraction * 100}%` }}
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute size-3.5 -translate-x-1/2 rounded-full bg-play shadow-[0_2px_6px_rgba(0,0,0,0.5)] transition-transform duration-150 ease-out group-data-[scrubbing=true]:scale-110"
        style={{ left: `${playedFraction * 100}%` }}
      />
    </div>
  );
}
