"use client";

import Image from "next/image";
import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { FALLBACK_COVER_URL } from "@/lib/placeholder";
import type { PlayerEpisode } from "@/types/series";

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface UpNextOverlayProps {
  episode: PlayerEpisode;
  secondsRemaining: number;
  totalSeconds: number;
  onPlayNow: () => void;
  onCancel: () => void;
}

/**
 * Takes over the picture once an episode finishes and another one exists. The ring
 * is the countdown itself rather than a label beside it, so the time left is
 * readable at a glance from across a room — and cancelling is a single obvious
 * click, which is what keeps auto-advance from feeling like it took over.
 */
export function UpNextOverlay({
  episode,
  secondsRemaining,
  totalSeconds,
  onPlayNow,
  onCancel,
}: UpNextOverlayProps) {
  const { t } = useLanguage();
  const elapsedFraction = totalSeconds > 0 ? 1 - Math.max(0, secondsRemaining) / totalSeconds : 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="animate-rise-in relative isolate flex w-full max-w-xl flex-col gap-4 overflow-hidden rounded-3xl bg-black/55 p-4 shadow-e3 ring-1 ring-white/12 backdrop-blur-xl ring-inset sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        {/* A contained aurora blush behind the card — the same ambient signature
            the rest of the app uses to mark "something new starts here". */}
        <div aria-hidden className="aurora-wash-soft pointer-events-none absolute inset-0 -z-10 opacity-40 blur-2xl" />

        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-white/10 ring-inset sm:w-44">
          <Image
            src={episode.thumbnailUrl ?? episode.posterUrl ?? FALLBACK_COVER_URL}
            alt={episode.title}
            fill
            sizes="(max-width: 640px) 100vw, 176px"
            className="object-cover"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
            {t.player.upNext.label}
            {episode.episodeNumber != null && (
              <span className="tracking-normal text-white/50 normal-case">
                {" · "}
                {t.player.episodes.episodeLabel(episode.episodeNumber)}
              </span>
            )}
          </p>
          {/* Wraps to a second line rather than truncating — the whole point of the
              card is knowing what you're about to watch. */}
          <p className="line-clamp-2 font-heading text-base leading-snug font-semibold tracking-tight text-white">
            {episode.title}
          </p>
          <p className="text-sm text-white/60 nums">{formatDuration(episode.duration)}</p>

          <div className="mt-3 flex items-center gap-2">
            <Button onClick={onPlayNow} className="h-10 rounded-full px-5">
              <Play className="size-4 fill-current" />
              {t.player.upNext.playNow}
            </Button>
            <Button
              variant="ghost"
              onClick={onCancel}
              className="h-10 rounded-full px-4 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
              {t.player.upNext.cancel}
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={onPlayNow}
          aria-label={t.player.upNext.playNow}
          className="relative hidden size-16 shrink-0 items-center justify-center rounded-full text-white outline-none transition-transform duration-200 ease-out hover:scale-105 focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95 sm:flex"
        >
          <svg viewBox="0 0 64 64" className="absolute inset-0 size-full -rotate-90">
            <circle cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
            <circle
              cx="32"
              cy="32"
              r={RING_RADIUS}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - elapsedFraction)}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <span className="text-lg font-bold tabular-nums">{Math.max(0, Math.ceil(secondsRemaining))}</span>
        </button>
      </div>
    </div>
  );
}
