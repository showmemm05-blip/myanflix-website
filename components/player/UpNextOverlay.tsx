"use client";

import { useId } from "react";
import { Artwork, PlayIcon } from "@/components/system";
import { buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlayerEpisode } from "@/types/series";
import styles from "./player.module.css";

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
 * The "Up next" corner card (Player.dc.html): it appears once an episode
 * finishes and another one exists, above the control row at the bottom right
 * (full width on phones). The crimson ring IS the countdown, so the time left
 * reads at a glance — and Cancel is one obvious tap, which is what keeps
 * auto-advance from feeling like it took over.
 */
export function UpNextOverlay({
  episode,
  secondsRemaining,
  totalSeconds,
  onPlayNow,
  onCancel,
}: UpNextOverlayProps) {
  const { t } = useLanguage();
  const p = useSection(playText);
  const titleId = useId();
  const elapsedFraction = totalSeconds > 0 ? 1 - Math.max(0, secondsRemaining) / totalSeconds : 0;
  const secondsLeft = Math.max(0, Math.ceil(secondsRemaining));
  // null when the runtime was never measured — a lone dash under a title reads as a bug, so the line is dropped.
  const runtime = formatDuration(episode.duration);

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "pointer-events-auto absolute right-[clamp(16px,2.5vw,32px)] bottom-[136px] z-20 flex w-[min(440px,calc(100%-48px))] items-center gap-3.5 rounded-[16px] py-3 pr-3.5 pl-3",
        "bg-[rgba(22,22,28,0.92)] shadow-[0_24px_64px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-[24px] backdrop-saturate-[1.4]",
        "max-desk:right-3 max-desk:bottom-16 max-desk:left-3 max-desk:w-auto",
        styles.rise,
      )}
    >
      <span className="relative aspect-video w-[132px] shrink-0 overflow-hidden rounded-card bg-raised">
        <Artwork
          src={episode.thumbnailUrl ?? episode.posterUrl}
          seed={episode.title}
          variant="landscape"
          sizes="132px"
          zoomOnHover={false}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="m-0 text-[11px] leading-[14px] font-extrabold tracking-[0.12em] text-link uppercase [&:lang(my)]:tracking-normal">
          {t.player.upNext.label}
          {episode.episodeNumber != null && (
            <span className="font-semibold tracking-normal text-fg-muted normal-case">
              {" · "}
              {t.player.episodes.episodeLabel(episode.episodeNumber)}
            </span>
          )}
        </p>
        {/* Wraps to a second line rather than truncating — the whole point of the
            card is knowing what you're about to watch. */}
        <h2 id={titleId} className="mt-1 line-clamp-2 text-base leading-[22px] font-extrabold text-fg">
          {episode.title}
        </h2>
        {runtime && <p className="m-0 text-[13px] leading-[18px] text-fg-faint tabular-nums">{runtime}</p>}

        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPlayNow}
            className={cn(buttonVariants({ variant: "play" }), "h-10 gap-2 rounded-button px-4 text-sm font-extrabold")}
          >
            <PlayIcon size={16} />
            {t.player.upNext.playNow}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={cn(buttonVariants({ variant: "tonal" }), "h-10 rounded-button px-3.5 text-sm font-bold")}
          >
            {t.player.upNext.cancel}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onPlayNow}
        aria-label={p.playNowIn(secondsLeft)}
        className="relative flex size-[60px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link max-desk:hidden"
      >
        <svg viewBox="0 0 64 64" aria-hidden className="absolute inset-0 size-full -rotate-90">
          <circle cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
          <circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--mq-crimson)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - elapsedFraction)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className="text-xl leading-6 font-extrabold tabular-nums">{secondsLeft}</span>
      </button>
    </section>
  );
}
