"use client";

import { useId } from "react";
import { hudButtonClass } from "@/components/player/PlayerControls";
import {
  ExitFullscreenIcon,
  FullscreenIcon,
  MutedIcon,
  PlayGlyph,
  VolumeIcon,
} from "@/components/player/player-icons";
import { buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import type { SkipState } from "@/lib/player/preroll";
import { cn } from "@/lib/utils";
import styles from "./player.module.css";

interface AdOverlayProps {
  title: string;
  /** Whole seconds of ad left (lib/player/preroll.ts adSecondsLeft). */
  secondsLeft: number;
  /** Whether Skip may show yet (lib/player/preroll.ts skipState). */
  skip: SkipState;
  onSkip: () => void;
  /** The ad is paused and not merely buffering — a click on the picture resumes it. */
  isPaused: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** One line under the countdown — at a break, that the movie carries on afterwards. */
  note?: string;
}

/**
 * The pre-roll ad's own chrome, in place of the movie HUD while the ad plays
 * (UpNextOverlay is the template: same glass card, same bottom-right spot).
 * No scrubber, no speed or quality, no episodes: an ad cannot be seeked or
 * sped up. What the viewer gets is the label and the time left, Skip once
 * the ad allows it ("Skip in N" until then, so the wait is never a mystery),
 * mute and fullscreen. The picture itself stays clickable for pause/resume.
 * Ad breaks (BreakAdLayer) reuse it with a `note` that the movie continues.
 */
export function AdOverlay({
  title,
  secondsLeft,
  skip,
  onSkip,
  isPaused,
  isMuted,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
  note,
}: AdOverlayProps) {
  const { t } = useLanguage();
  const p = useSection(playText);
  const titleId = useId();
  const labels = t.player.controls;

  return (
    <section aria-labelledby={titleId} className="absolute inset-0">
      {isPaused && (
        <div aria-hidden className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "flex h-11 items-center gap-2.5 rounded-full bg-art-badge px-[18px] text-sm font-bold text-fg backdrop-blur-[14px]",
              styles.fade,
            )}
          >
            <PlayGlyph size={16} />
            {p.adPaused}
          </span>
        </div>
      )}

      <div
        className={cn(
          "pointer-events-auto absolute inset-x-[clamp(16px,2.5vw,32px)] bottom-[clamp(16px,2.5vw,32px)] flex items-end gap-3",
          "max-desk:inset-x-3 max-desk:bottom-3",
          styles.rise,
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-0.5 rounded-[16px] px-4 py-3",
            "bg-[rgba(22,22,28,0.92)] shadow-[0_24px_64px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-[24px] backdrop-saturate-[1.4]",
          )}
        >
          <p className="m-0 text-[11px] leading-[14px] font-extrabold tracking-[0.12em] text-link uppercase [&:lang(my)]:tracking-normal">
            {p.adLabel}
          </p>
          <h2 id={titleId} className="m-0 truncate text-base leading-[22px] font-extrabold text-fg">
            {title}
          </h2>
          {/* The seconds change every tick; a live region would read every one aloud. */}
          <p className="m-0 text-[13px] leading-[18px] text-fg-faint tabular-nums">{p.adEndsIn(secondsLeft)}</p>
          {note && <p className="m-0 text-[13px] leading-[18px] text-fg-muted">{note}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {skip.kind === "ready" && (
            <button
              type="button"
              onClick={onSkip}
              className={cn(buttonVariants({ variant: "play" }), "h-11 gap-2 rounded-button px-5 text-sm font-extrabold")}
            >
              {p.skipAd}
            </button>
          )}
          {skip.kind === "wait" && (
            <span
              aria-live="off"
              className={cn(
                buttonVariants({ variant: "tonal" }),
                "h-11 cursor-default rounded-button px-4 text-sm font-bold text-fg-muted tabular-nums opacity-80 hover:bg-tonal",
              )}
            >
              {p.skipAdIn(skip.secondsLeft)}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleMute}
            title={isMuted ? labels.unmute : labels.mute}
            aria-label={isMuted ? labels.unmute : labels.mute}
            aria-pressed={isMuted}
            className={cn(hudButtonClass(), "bg-art-badge backdrop-blur-[14px]")}
          >
            {isMuted ? <MutedIcon /> : <VolumeIcon />}
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
            aria-label={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
            className={cn(hudButtonClass(), "bg-art-badge backdrop-blur-[14px]")}
          >
            {isFullscreen ? <ExitFullscreenIcon size={20} /> : <FullscreenIcon size={20} />}
          </button>
        </div>
      </div>
    </section>
  );
}
