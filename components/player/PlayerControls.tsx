"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import {
  Download,
  FastForward,
  Maximize,
  Minimize,
  Pause,
  Play,
  RectangleHorizontal,
  Rewind,
  Settings,
  SkipForward,
  Subtitles,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { ScrubBar } from "@/components/player/ScrubBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/context/language-context";
import { formatTimecode } from "@/lib/format";
import { cn } from "@/lib/utils";

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const SUBTITLE_OPTIONS = ["Off", "English", "Burmese"] as const;
export const AUDIO_OPTIONS = ["Original", "English", "Burmese"] as const;

const SKIP_SECONDS = 10;

export interface PrefetchStatusDisplay {
  downloadingCount: number;
  downloadedCount: number;
  queuedCount: number;
  cachedRangeStart: number | null;
  cachedRangeEnd: number | null;
}

/**
 * Every control shares one hit size and hover treatment so the bar reads as a
 * single instrument. The `large` play button is the only one allowed to be
 * bigger — it is the control a hand reaches for without looking.
 */
function ControlButton({
  children,
  label,
  onClick,
  active,
  large,
  className,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  large?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-white/85 outline-none",
        "transition-[background-color,color,transform] duration-150 ease-out",
        "hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 active:scale-90",
        large ? "size-11" : "size-9",
        active && "bg-primary/20 text-primary hover:bg-primary/25 hover:text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTimeSeconds: number;
  durationSeconds: number;
  onSeek: (seconds: number) => void;
  onSkip: (deltaSeconds: number) => void;
  /** Pins the bar open for the duration of a drag. */
  onScrubbingChange?: (scrubbing: boolean) => void;
  /** Real buffered ranges straight off the `<video>` element, in seconds. */
  bufferedRanges: [number, number][];
  prefetchStatus: PrefetchStatusDisplay | null;
  volume: number; // 0-100
  onVolumeChange: (value: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTheater: boolean;
  onToggleTheater: () => void;
  speed: number;
  onSpeedChange: (value: number) => void;
  /** First entry is always "Auto"; the rest come from the HLS manifest's real renditions. */
  qualityOptions: string[];
  quality: string;
  onQualityChange: (value: string) => void;
  subtitle: string;
  onSubtitleChange: (value: string) => void;
  audio: string;
  onAudioChange: (value: string) => void;
  /**
   * Fullscreen mode only renders the fullscreened element's own subtree — a
   * dropdown portaled to the default `document.body` becomes invisible and
   * unclickable once fullscreen is active. Passing the player's own
   * fullscreen container here keeps these menus inside that subtree instead.
   */
  fullscreenContainerRef?: RefObject<HTMLElement | null>;
  /** Series-only quick action — omitted entirely (not just disabled) when there's no next episode. */
  onNextEpisode?: () => void;
  /** Lets the parent hold the bar open while a menu is on screen, so auto-hide can't pull it out from under an open dropdown. */
  onMenuOpenChange?: (open: boolean) => void;
}

export function PlayerControls({
  isPlaying,
  onTogglePlay,
  currentTimeSeconds,
  durationSeconds,
  onSeek,
  onSkip,
  onScrubbingChange,
  bufferedRanges,
  prefetchStatus,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
  isTheater,
  onToggleTheater,
  speed,
  onSpeedChange,
  qualityOptions,
  quality,
  onQualityChange,
  subtitle,
  onSubtitleChange,
  audio,
  onAudioChange,
  fullscreenContainerRef,
  onNextEpisode,
  onMenuOpenChange,
}: PlayerControlsProps) {
  const { t } = useLanguage();
  const labels = t.player.controls;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  // Controlled explicitly (rather than relying on the menu's own default
  // close behavior) so selecting any option — subtitle, audio, speed, or
  // quality — reliably closes its dropdown.
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  const anyMenuOpen = subtitleMenuOpen || settingsMenuOpen;
  useEffect(() => {
    onMenuOpenChange?.(anyMenuOpen);
  }, [anyMenuOpen, onMenuOpenChange]);

  const prefetchLabel = !prefetchStatus
    ? null
    : prefetchStatus.downloadingCount > 0
      ? `Caching ${prefetchStatus.downloadingCount}`
      : prefetchStatus.cachedRangeStart !== null && prefetchStatus.cachedRangeEnd !== null
        ? `Ready ${formatTimecode(prefetchStatus.cachedRangeStart)}–${formatTimecode(prefetchStatus.cachedRangeEnd)}`
        : null;

  return (
    <div className="bg-gradient-to-t from-black/95 via-black/65 to-transparent px-2 pt-20 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-3">
      <ScrubBar
        currentTime={currentTimeSeconds}
        duration={durationSeconds}
        bufferedRanges={bufferedRanges}
        onSeek={onSeek}
        onScrubbingChange={onScrubbingChange}
      />

      {/* The transport row is its own quiet-glass tray from `sm` up, so the
          controls read as one instrument sitting on the picture rather than a
          row of icons floating loose over it. */}
      <div className="mt-1.5 flex items-center gap-0.5 sm:gap-1 sm:rounded-2xl sm:bg-white/[0.05] sm:px-1.5 sm:py-1 sm:ring-1 sm:ring-white/10 sm:backdrop-blur-md sm:ring-inset">
        <ControlButton label={isPlaying ? labels.pause : labels.play} onClick={onTogglePlay} large>
          {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
        </ControlButton>

        <ControlButton label={labels.skipBack(SKIP_SECONDS)} onClick={() => onSkip(-SKIP_SECONDS)}>
          <Rewind className="size-5" />
        </ControlButton>

        <ControlButton label={labels.skipForward(SKIP_SECONDS)} onClick={() => onSkip(SKIP_SECONDS)}>
          <FastForward className="size-5" />
        </ControlButton>

        {/* Below `sm` the row simply cannot hold everything without clipping the
            right-hand cluster, so the two controls with an equivalent elsewhere
            step aside: next-episode lives in the episode rail, and volume is the
            phone's own hardware buttons. */}
        {onNextEpisode && (
          <ControlButton label={labels.nextEpisode} onClick={onNextEpisode} className="hidden sm:inline-flex">
            <SkipForward className="size-5" />
          </ControlButton>
        )}

        <div className="group hidden items-center sm:flex">
          <ControlButton label={isMuted ? labels.unmute : labels.mute} onClick={onToggleMute}>
            <VolumeIcon className="size-5" />
          </ControlButton>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            aria-label={labels.volume}
            onValueChange={(v) => onVolumeChange(Array.isArray(v) ? v[0] : v)}
            className="w-0 overflow-hidden transition-all duration-200 [&_[data-slot=slider-track]]:bg-white/30 group-hover:ml-1 group-hover:w-20 group-focus-within:ml-1 group-focus-within:w-20"
          />
        </div>

        <span className="ml-1.5 shrink-0 text-xs font-semibold text-white tabular-nums sm:ml-2.5 sm:text-[13px]">
          {formatTimecode(currentTimeSeconds)}
          <span className="font-medium text-white/50"> / {formatTimecode(durationSeconds)}</span>
        </span>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {prefetchLabel && (
            <span
              className="hidden items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-medium text-white/70 tabular-nums ring-1 ring-white/12 ring-inset lg:inline-flex"
              title={labels.cacheHint}
            >
              <Download
                className={cn("size-3", prefetchStatus!.downloadingCount > 0 && "animate-pulse text-primary")}
              />
              {prefetchLabel}
            </span>
          )}

          <DropdownMenu open={subtitleMenuOpen} onOpenChange={setSubtitleMenuOpen}>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  title={labels.subtitlesAndAudio}
                  aria-label={labels.subtitlesAndAudio}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white/85 outline-none transition-[background-color,color,transform] duration-150 ease-out hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 active:scale-90 aria-expanded:bg-white/15 aria-expanded:text-white"
                />
              }
            >
              <Subtitles className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" container={fullscreenContainerRef}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>{labels.subtitles}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={subtitle}
                  onValueChange={(v) => {
                    onSubtitleChange(v);
                    setSubtitleMenuOpen(false);
                  }}
                >
                  {SUBTITLE_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{labels.audio}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={audio}
                  onValueChange={(v) => {
                    onAudioChange(v);
                    setSubtitleMenuOpen(false);
                  }}
                >
                  {AUDIO_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={settingsMenuOpen} onOpenChange={setSettingsMenuOpen}>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  title={labels.speedAndQuality}
                  aria-label={labels.speedAndQuality}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-white/85 outline-none transition-[background-color,color,transform] duration-150 ease-out hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 active:scale-90 aria-expanded:bg-white/15 aria-expanded:text-white"
                />
              }
            >
              <Settings className="size-5" />
              {/* Surfacing the active rendition here means the common "what am I
                  actually streaming at?" question never needs a menu round trip. */}
              <span className="hidden text-[11px] font-semibold tracking-wide tabular-nums sm:inline">
                {quality}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" container={fullscreenContainerRef}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>{labels.playbackSpeed}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={speed.toString()}
                  onValueChange={(v) => {
                    onSpeedChange(Number(v));
                    setSettingsMenuOpen(false);
                  }}
                >
                  {SPEED_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option.toString()}>
                      {option}x
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{labels.quality}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={quality}
                  onValueChange={(v) => {
                    onQualityChange(v);
                    setSettingsMenuOpen(false);
                  }}
                >
                  {qualityOptions.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theater widens the stage in-page; pointless once the video already
              owns the whole screen, so it steps aside in fullscreen. */}
          {!isFullscreen && (
            <ControlButton
              label={isTheater ? labels.exitTheaterMode : labels.theaterMode}
              onClick={onToggleTheater}
              active={isTheater}
              className="hidden lg:inline-flex"
            >
              <RectangleHorizontal className="size-5" />
            </ControlButton>
          )}

          <ControlButton
            label={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
