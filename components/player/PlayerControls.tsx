"use client";

import {
  Download,
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Subtitles,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
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

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const SUBTITLE_OPTIONS = ["Off", "English", "Burmese"] as const;
export const AUDIO_OPTIONS = ["Original", "English", "Burmese"] as const;

const SKIP_SECONDS = 10;

function formatClockShort(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export interface PrefetchStatusDisplay {
  downloadingCount: number;
  downloadedCount: number;
  queuedCount: number;
  cachedRangeStart: number | null;
  cachedRangeEnd: number | null;
}

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  progress: number; // 0-100
  onSeek: (value: number) => void;
  onSkip: (deltaSeconds: number) => void;
  currentTime: string;
  duration: string;
  durationSeconds: number;
  /** Real buffered ranges straight off the <video> element, in seconds. */
  bufferedRanges: [number, number][];
  prefetchStatus: PrefetchStatusDisplay | null;
  volume: number; // 0-100
  onVolumeChange: (value: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
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
}

export function PlayerControls({
  isPlaying,
  onTogglePlay,
  progress,
  onSeek,
  onSkip,
  currentTime,
  duration,
  durationSeconds,
  bufferedRanges,
  prefetchStatus,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
  speed,
  onSpeedChange,
  qualityOptions,
  quality,
  onQualityChange,
  subtitle,
  onSubtitleChange,
  audio,
  onAudioChange,
}: PlayerControlsProps) {
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const pct = (seconds: number) => (durationSeconds > 0 ? Math.min(100, (seconds / durationSeconds) * 100) : 0);

  return (
    <div className="flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-10 sm:px-6">
      <Slider
        value={[progress]}
        max={100}
        step={0.1}
        onValueChange={(v) => onSeek(Array.isArray(v) ? v[0] : v)}
        bufferedRanges={bufferedRanges.map(([start, end]) => [pct(start), pct(end)])}
        className="cursor-pointer"
      />
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{currentTime}</span>
        {prefetchStatus && (
          <span className="flex items-center gap-1.5 text-[11px] text-white/50">
            <Download className={prefetchStatus.downloadingCount > 0 ? "size-3 animate-pulse" : "size-3"} />
            {prefetchStatus.downloadingCount > 0
              ? `Prefetching ${prefetchStatus.downloadingCount} segment${prefetchStatus.downloadingCount === 1 ? "" : "s"}…`
              : prefetchStatus.cachedRangeStart !== null && prefetchStatus.cachedRangeEnd !== null
                ? `Cached ${formatClockShort(prefetchStatus.cachedRangeStart)}–${formatClockShort(prefetchStatus.cachedRangeEnd)}`
                : "Buffering…"}
          </span>
        )}
        <span>{duration}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => onSkip(-SKIP_SECONDS)}
            aria-label="Back 10 seconds"
          >
            <SkipBack className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={onTogglePlay}
          >
            {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => onSkip(SKIP_SECONDS)}
            aria-label="Forward 10 seconds"
          >
            <SkipForward className="size-4" />
          </Button>

          <div className="group hidden items-center gap-1.5 sm:flex">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={onToggleMute}>
              <VolumeIcon className="size-4" />
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={(v) => onVolumeChange(Array.isArray(v) ? v[0] : v)}
              className="w-0 overflow-hidden transition-all duration-200 group-hover:w-20"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" />
              }
            >
              <Subtitles className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Subtitles</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={subtitle} onValueChange={onSubtitleChange}>
                  {SUBTITLE_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Audio</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={audio} onValueChange={onAudioChange}>
                  {AUDIO_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" />
              }
            >
              <Settings className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Playback speed</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={speed.toString()} onValueChange={(v) => onSpeedChange(Number(v))}>
                  {SPEED_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option.toString()}>
                      {option}x
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Quality</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={quality} onValueChange={onQualityChange}>
                  {qualityOptions.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
