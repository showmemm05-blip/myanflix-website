"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Slider } from "@/components/ui/slider";
import { ScrubBar } from "@/components/player/ScrubBar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SubtitleSize, SubtitleStyleSettings } from "@/components/player/SubtitleOverlay";
import {
  DownloadIcon,
  EpisodesIcon,
  ExitFullscreenIcon,
  ForwardIcon,
  FullscreenIcon,
  GearIcon,
  MutedIcon,
  NextEpisodeIcon,
  PauseGlyph,
  PlayGlyph,
  ReplayIcon,
  SelectedTick,
  SubtitlesIcon,
  TheaterIcon,
  VolumeIcon,
  VolumeLowIcon,
} from "@/components/player/player-icons";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { formatTimecode } from "@/lib/format";
import { cn } from "@/lib/utils";
import styles from "./player.module.css";

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

type PlayStrings = (typeof playText)["en"];

/** "Auto" stays the internal value; only its on-screen name is translated. */
function qualityName(quality: string, p: PlayStrings): string {
  return quality === "Auto" ? p.qualityAuto : quality;
}

/** The "no subtitles" sentinel — the same value hls.js uses for `subtitleTrack`. */
export const SUBTITLES_OFF = -1;

/**
 * One `#EXT-X-MEDIA:TYPE=SUBTITLES` rendition the manifest declared. The id is
 * the index the playback engine addresses the track by, not a database id.
 */
export interface SubtitleTrackOption {
  id: number;
  label: string;
}

const SKIP_SECONDS = 10;

export interface PrefetchStatusDisplay {
  downloadingCount: number;
  downloadedCount: number;
  queuedCount: number;
  cachedRangeStart: number | null;
  cachedRangeEnd: number | null;
}

/**
 * Every round control on the video shares one 44px hit size and the board's
 * hover (14% white disc) and press (.92) — so the row reads as one instrument.
 * `active` is the "on" state (theater, an open panel): a 16% white disc.
 */
export const hudButtonClass = (active = false) =>
  cn(
    "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 text-fg outline-none",
    "transition-[background-color,transform] duration-150 ease-out hover:bg-white/14 active:scale-[0.92]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
    active ? "bg-tonal" : "bg-transparent",
  );

/** The same, as a pill with a label beside the icon (Subtitles, Episodes, speed). */
export const hudPillClass = (active = false) =>
  cn(
    "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border-0 px-3 text-fg outline-none",
    "transition-[background-color,transform] duration-150 ease-out hover:bg-white/14 active:scale-[0.92]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
    "aria-expanded:bg-tonal",
    active ? "bg-tonal" : "bg-transparent",
  );

function ControlButton({
  children,
  label,
  onClick,
  active,
  pressed,
  className,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  /** Toggle buttons announce their state (theater mode). */
  pressed?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(hudButtonClass(active), className)}
    >
      {children}
    </button>
  );
}

/* ── Pop-up pieces (Player.dc.html "Playback speed and quality" / "Subtitles and audio") ── */

const POP_CLASS =
  "w-[340px] max-desk:w-[calc(100vw-24px)] rounded-[16px] bg-popover p-4 text-fg shadow-[0_24px_64px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.08)]";

function PopLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn(
        "m-0 text-[11px] leading-[14px] font-extrabold tracking-[0.08em] text-fg-faint uppercase [&:lang(my)]:tracking-normal",
        className,
      )}
    >
      {children}
    </MenuPrimitive.GroupLabel>
  );
}

function PopDivider() {
  return <div aria-hidden className="mt-4 mb-3 h-px bg-hairline" />;
}

/** A full-width row option with the crimson tick when chosen (quality, tracks, audio). */
function RowOption({ value, children }: { value: string; children: ReactNode }) {
  return (
    <MenuPrimitive.RadioItem
      value={value}
      className={cn(
        "flex h-11 w-full cursor-pointer items-center justify-between rounded-[10px] px-3 text-left text-[15px] font-medium text-fg-body tabular-nums outline-none select-none",
        "data-highlighted:bg-tonal-ghost data-highlighted:text-fg",
        "data-checked:bg-raised data-checked:font-extrabold data-checked:text-fg",
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      <MenuPrimitive.RadioItemIndicator className="flex shrink-0">
        <SelectedTick />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

/** A segment inside a small pill track (subtitle size / background). */
function SegmentOption({ value, children }: { value: string; children: ReactNode }) {
  return (
    <MenuPrimitive.RadioItem
      value={value}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-[13px] font-bold whitespace-nowrap text-fg-muted outline-none select-none",
        "data-highlighted:outline-2 data-highlighted:outline-offset-1 data-highlighted:outline-link",
        "data-checked:bg-play data-checked:font-extrabold data-checked:text-ink",
      )}
    >
      {children}
    </MenuPrimitive.RadioItem>
  );
}

/**
 * Playback speed and quality — the top-right button of the player (as on the
 * mobile portrait player). Speeds are six tiles (white = chosen), qualities
 * a list with the crimson tick. Choosing either closes the pop-up.
 */
export function SpeedQualityMenu({
  speed,
  onSpeedChange,
  qualityOptions,
  quality,
  onQualityChange,
  fullscreenContainerRef,
  onOpenChange,
}: {
  speed: number;
  onSpeedChange: (value: number) => void;
  /** First entry is always "Auto"; the rest come from the HLS manifest's real renditions. */
  qualityOptions: string[];
  quality: string;
  onQualityChange: (value: string) => void;
  /** Keeps the pop-up inside the fullscreen element (see PlayerControls). */
  fullscreenContainerRef?: RefObject<HTMLElement | null>;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const p = useSection(playText);
  const labels = t.player.controls;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            title={labels.speedAndQuality}
            aria-label={p.speedAndQualityNow(qualityName(quality, p))}
            className={cn(hudPillClass(), "bg-glass backdrop-blur-[14px] aria-expanded:bg-tonal")}
          />
        }
      >
        <GearIcon size={20} />
        {/* Surfacing the active rendition here means the common "what am I
            actually streaming at?" question never needs a menu round trip. */}
        <span className="text-[13px] leading-[18px] font-extrabold tabular-nums">{qualityName(quality, p)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={10}
        container={fullscreenContainerRef}
        className={POP_CLASS}
      >
        <MenuPrimitive.Group>
          <PopLabel>{labels.playbackSpeed}</PopLabel>
          <MenuPrimitive.RadioGroup
            value={speed.toString()}
            onValueChange={(v) => {
              onSpeedChange(Number(v));
              setOpen(false);
            }}
            className="mt-2.5 grid grid-cols-3 gap-2"
          >
            {SPEED_OPTIONS.map((option) => (
              <MenuPrimitive.RadioItem
                key={option}
                value={option.toString()}
                className={cn(
                  "flex h-12 cursor-pointer items-center justify-center rounded-[12px] bg-raised text-base font-extrabold text-fg tabular-nums outline-none select-none",
                  "data-highlighted:outline-2 data-highlighted:outline-offset-2 data-highlighted:outline-link",
                  "data-checked:bg-play data-checked:text-ink",
                )}
              >
                {option}x
              </MenuPrimitive.RadioItem>
            ))}
          </MenuPrimitive.RadioGroup>
        </MenuPrimitive.Group>
        <PopDivider />
        <MenuPrimitive.Group>
          <PopLabel>{labels.quality}</PopLabel>
          <MenuPrimitive.RadioGroup
            value={quality}
            onValueChange={(v) => {
              onQualityChange(v);
              setOpen(false);
            }}
            className="mt-2 flex flex-col gap-0.5"
          >
            {qualityOptions.map((option) => (
              <RowOption key={option} value={option}>
                {qualityName(option, p)}
              </RowOption>
            ))}
          </MenuPrimitive.RadioGroup>
        </MenuPrimitive.Group>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "MY" / "EN" for the crimson tag on the subtitles button. Decorative only. */
function trackCode(label: string): string {
  if (/burm|myan|^my\b|မြန်မာ/i.test(label)) return "MY";
  if (/^en|engl/i.test(label)) return "EN";
  return label.trim().slice(0, 2).toUpperCase();
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
  /**
   * The subtitle renditions the manifest actually carries. An empty list drops
   * the subtitle section from the pop-up — a menu whose only entry is "Off" is a
   * dead end that reads as a broken feature rather than an absent one. The
   * audio section stays either way; it does not depend on the manifest.
   */
  subtitleTracks: SubtitleTrackOption[];
  subtitleStyle: SubtitleStyleSettings;
  onSubtitleStyleChange: (style: SubtitleStyleSettings) => void;
  /** Id of the selected rendition, or `SUBTITLES_OFF`. */
  subtitleTrack: number;
  onSubtitleTrackChange: (trackId: number) => void;
  /**
   * Fullscreen mode only renders the fullscreened element's own subtree — a
   * dropdown portaled to the default `document.body` becomes invisible and
   * unclickable once fullscreen is active. Passing the player's own
   * fullscreen container here keeps these menus inside that subtree instead.
   */
  fullscreenContainerRef?: RefObject<HTMLElement | null>;
  /** Series-only quick action — omitted entirely (not just disabled) when there's no next episode. */
  onNextEpisode?: () => void;
  /** Series only: shows/hides the episode panel. Omitted for movies. */
  onToggleEpisodes?: () => void;
  episodesOpen?: boolean;
  /** Lets the parent hold the bar open while a menu is on screen, so auto-hide can't pull it out from under an open dropdown. */
  onMenuOpenChange?: (open: boolean) => void;
}

/**
 * The bottom of the HUD (Player.dc.html): the crimson scrub bar, then one row —
 * play, ±10, next episode, mute + white volume slider and the clock on the
 * left; the cache chip, Subtitles & audio, Episodes, Theater and Fullscreen on
 * the right. Under 720px the extras step aside (volume is the phone's own
 * buttons; skip lives on the centre transport; next episode in the panel).
 */
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
  subtitleTracks,
  subtitleStyle,
  onSubtitleStyleChange,
  subtitleTrack,
  onSubtitleTrackChange,
  fullscreenContainerRef,
  onNextEpisode,
  onToggleEpisodes,
  episodesOpen = false,
  onMenuOpenChange,
}: PlayerControlsProps) {
  const { t } = useLanguage();
  const p = useSection(playText);
  const labels = t.player.controls;
  const VolumeGlyph = isMuted || volume === 0 ? MutedIcon : volume < 50 ? VolumeLowIcon : VolumeIcon;

  // Controlled explicitly (rather than relying on the menu's own default
  // close behavior) so selecting a subtitle track reliably closes it.
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);

  const hasSubtitleTracks = subtitleTracks.length > 0;
  // The pop-up only exists while there are subtitle tracks, so it can never
  // count as "open" (and hold the controls on screen) once they are gone.
  const menuOpen = hasSubtitleTracks && subtitleMenuOpen;
  useEffect(() => {
    onMenuOpenChange?.(menuOpen);
  }, [menuOpen, onMenuOpenChange]);

  const activeTrack = subtitleTracks.find((track) => track.id === subtitleTrack);

  const prefetchLabel = !prefetchStatus
    ? null
    : prefetchStatus.downloadingCount > 0
      ? p.caching(prefetchStatus.downloadingCount)
      : prefetchStatus.cachedRangeStart !== null && prefetchStatus.cachedRangeEnd !== null
        ? p.cacheReady(formatTimecode(prefetchStatus.cachedRangeStart), formatTimecode(prefetchStatus.cachedRangeEnd))
        : null;

  return (
    <div className={cn("pb-[max(12px,env(safe-area-inset-bottom))]", styles.fade)}>
      <div className="px-[clamp(16px,2.5vw,32px)]">
        <ScrubBar
          currentTime={currentTimeSeconds}
          duration={durationSeconds}
          bufferedRanges={bufferedRanges}
          onSeek={onSeek}
          onScrubbingChange={onScrubbingChange}
        />
      </div>

      <div className="mt-1.5 flex h-12 items-center gap-0.5 px-[clamp(8px,1.8vw,24px)]">
        <ControlButton label={isPlaying ? labels.pause : labels.play} onClick={onTogglePlay}>
          {isPlaying ? <PauseGlyph /> : <PlayGlyph />}
        </ControlButton>

        <ControlButton
          label={labels.skipBack(SKIP_SECONDS)}
          onClick={() => onSkip(-SKIP_SECONDS)}
          className="max-desk:hidden"
        >
          <ReplayIcon />
        </ControlButton>

        <ControlButton
          label={labels.skipForward(SKIP_SECONDS)}
          onClick={() => onSkip(SKIP_SECONDS)}
          className="max-desk:hidden"
        >
          <ForwardIcon />
        </ControlButton>

        {onNextEpisode && (
          <ControlButton label={labels.nextEpisode} onClick={onNextEpisode} className="max-desk:hidden">
            <NextEpisodeIcon size={20} />
          </ControlButton>
        )}

        <div className="ml-0.5 flex items-center gap-1.5 max-desk:hidden">
          <ControlButton label={isMuted ? labels.unmute : labels.mute} onClick={onToggleMute}>
            <VolumeGlyph />
          </ControlButton>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            aria-label={labels.volume}
            onValueChange={(v) => onVolumeChange(Array.isArray(v) ? v[0] : v)}
            className="w-[88px] [&_[data-slot=slider-range]]:bg-play [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-track]]:bg-white/30"
          />
        </div>

        <span className="ml-3 shrink-0 text-sm leading-5 font-bold whitespace-nowrap text-fg tabular-nums">
          {formatTimecode(currentTimeSeconds)}
          <span className="font-semibold text-fg-muted"> / {formatTimecode(durationSeconds)}</span>
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          {prefetchLabel && (
            <span
              className="mr-1.5 inline-flex h-7 items-center gap-1.5 rounded-full bg-tonal-faint px-2.5 text-[12px] font-bold whitespace-nowrap text-fg-muted tabular-nums max-desk:hidden"
              title={labels.cacheHint}
            >
              <DownloadIcon
                size={14}
                className={cn(prefetchStatus!.downloadingCount > 0 && "animate-pulse text-link")}
              />
              {prefetchLabel}
            </span>
          )}

          {/* Subtitles pop-up, shown only when the manifest declares subtitle
              tracks: an empty menu would be a promise it can't keep. The
              audio-language group was removed on 2026-10-07: the transcoder
              makes one audio track, so its Original/English/Burmese choice
              changed nothing. */}
          {hasSubtitleTracks && (
          <DropdownMenu open={menuOpen} onOpenChange={setSubtitleMenuOpen}>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  title={labels.subtitles}
                  aria-label={labels.subtitles}
                  className={hudPillClass()}
                />
              }
            >
              <SubtitlesIcon />
              {activeTrack && (
                <span
                  aria-hidden
                  className="h-[18px] rounded-[4px] bg-crimson px-[5px] text-[11px] leading-[18px] font-extrabold text-fg"
                >
                  {trackCode(activeTrack.label)}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={12}
              container={fullscreenContainerRef}
              className={cn(POP_CLASS, "w-[360px]", styles.vscroll)}
            >
              <MenuPrimitive.Group>
                <PopLabel>{labels.subtitles}</PopLabel>
                {/* Track ids are numbers; the radio group compares strings. */}
                <MenuPrimitive.RadioGroup
                  value={subtitleTrack.toString()}
                  onValueChange={(v) => {
                    onSubtitleTrackChange(Number(v));
                    setSubtitleMenuOpen(false);
                  }}
                  className="mt-2 flex flex-col gap-0.5"
                >
                  <RowOption value={SUBTITLES_OFF.toString()}>{labels.subtitlesOff}</RowOption>
                  {subtitleTracks.map((track) => (
                    <RowOption key={track.id} value={track.id.toString()}>
                      {track.label}
                    </RowOption>
                  ))}
                </MenuPrimitive.RadioGroup>
              </MenuPrimitive.Group>
              {/* Appearance only matters while something is on screen —
                  with subtitles Off these controls would adjust nothing
                  the viewer can see. */}
              {subtitleTrack !== SUBTITLES_OFF && (
                <>
                  <MenuPrimitive.Group className="mt-3 flex items-center justify-between gap-3">
                    <MenuPrimitive.GroupLabel className="text-sm leading-5 font-semibold text-fg-body">
                      {labels.subtitleSize}
                    </MenuPrimitive.GroupLabel>
                    <MenuPrimitive.RadioGroup
                      value={subtitleStyle.size}
                      onValueChange={(v) =>
                        onSubtitleStyleChange({ ...subtitleStyle, size: v as SubtitleSize })
                      }
                      className="flex gap-0.5 rounded-full bg-raised p-[3px]"
                    >
                      <SegmentOption value="small">{labels.subtitleSizeSmall}</SegmentOption>
                      <SegmentOption value="medium">{labels.subtitleSizeMedium}</SegmentOption>
                      <SegmentOption value="large">{labels.subtitleSizeLarge}</SegmentOption>
                    </MenuPrimitive.RadioGroup>
                  </MenuPrimitive.Group>
                  <MenuPrimitive.Group className="mt-2.5 flex items-center justify-between gap-3">
                    <MenuPrimitive.GroupLabel className="text-sm leading-5 font-semibold text-fg-body">
                      {labels.subtitleBackground}
                    </MenuPrimitive.GroupLabel>
                    <MenuPrimitive.RadioGroup
                      value={subtitleStyle.background ? "on" : "off"}
                      onValueChange={(v) =>
                        onSubtitleStyleChange({ ...subtitleStyle, background: v === "on" })
                      }
                      className="flex gap-0.5 rounded-full bg-raised p-[3px]"
                    >
                      <SegmentOption value="on">{labels.subtitleBackgroundOn}</SegmentOption>
                      <SegmentOption value="off">{labels.subtitleBackgroundOff}</SegmentOption>
                    </MenuPrimitive.RadioGroup>
                  </MenuPrimitive.Group>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}

          {onToggleEpisodes && (
            <button
              type="button"
              onClick={onToggleEpisodes}
              aria-label={t.player.episodes.title}
              aria-pressed={episodesOpen}
              // Only while the panel is mounted, so the reference never dangles.
              aria-controls={episodesOpen ? "episode-rail" : undefined}
              className={hudPillClass(episodesOpen)}
            >
              <EpisodesIcon size={20} />
              <span className="text-sm font-bold max-desk:hidden">{t.player.episodes.title}</span>
            </button>
          )}

          {/* Theater changes the page layout; pointless once the video already
              owns the whole screen, so it steps aside in fullscreen. */}
          {!isFullscreen && (
            <ControlButton
              label={isTheater ? labels.exitTheaterMode : labels.theaterMode}
              onClick={onToggleTheater}
              active={isTheater}
              pressed={isTheater}
              className="max-desk:hidden"
            >
              <TheaterIcon />
            </ControlButton>
          )}

          <ControlButton
            label={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <ExitFullscreenIcon size={20} /> : <FullscreenIcon size={20} />}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
