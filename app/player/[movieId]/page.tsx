"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Hls from "hls.js";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Clapperboard,
  Clock,
  FastForward,
  Loader2,
  Lock,
  Pause,
  Play,
  Plus,
  Rewind,
  Share2,
  Sparkles,
  Star,
  Volume1,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { PlayerControls } from "@/components/player/PlayerControls";
import { AmbientBackdrop } from "@/components/player/AmbientBackdrop";
import { PlayerHud, type HudMessage } from "@/components/player/PlayerHud";
import { EpisodeRail } from "@/components/player/EpisodeRail";
import { UpNextOverlay } from "@/components/player/UpNextOverlay";
import { NetworkStatusIcon } from "@/components/player/NetworkStatusIcon";
import { PosterRail } from "@/components/browse/PosterRail";
import { movieToBrowseItem } from "@/components/browse/browse-item";
import { PageLoader } from "@/components/loading/Spinner";
import { EmptyState } from "@/components/empty/EmptyState";
import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { ShareDialog } from "@/components/modals/ShareDialog";
import { Button } from "@/components/ui/button";
import { AccessBadge, Chip, Kicker } from "@/components/system";
import { useMovie, useSimilarMovies } from "@/hooks/use-movies";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { seriesService } from "@/services/api/seriesService";
import { historyService } from "@/services/api/historyService";
import { videoService } from "@/services/api/videoService";
import { ApiError } from "@/services/api/apiClient";
import { createPrefetchSystem, type PrefetchHandle } from "@/lib/streaming/PrefetchController";
import { useNetworkQuality } from "@/lib/hooks/use-network-quality";
import { usePlayerHotkeys } from "@/lib/hooks/use-player-hotkeys";
import type { PrefetchStatusDisplay } from "@/components/player/PlayerControls";
import { formatDuration, formatTimecode } from "@/lib/format";
import { FALLBACK_COVER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

const AUTO_HIDE_MS = 3000;
const PROGRESS_SAVE_INTERVAL_MS = 8000;
const HUD_VISIBLE_MS = 800;
const UP_NEXT_COUNTDOWN_SECONDS = 8;
// Sliding cache window: how much video stays prefetched/cached around the current playback position.
const PREFETCH_BEFORE_SECONDS = 10;
const PREFETCH_AFTER_SECONDS = 10;

interface QualityLevel {
  label: string;
  index: number; // -1 for Auto
}

export default function PlayerPage({ params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = use(params);
  const router = useRouter();
  const { t } = useLanguage();
  const { data: movie, isLoading } = useMovie(movieId);
  const { data: similarMovies, isLoading: isSimilarLoading } = useSimilarMovies(movieId);
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();

  // Episodes inherit access from their parent series' own accessType —
  // per-episode access never exists.
  const { data: parentSeries } = useQuery({
    queryKey: ["series", movie?.seriesId],
    queryFn: () => seriesService.getSeriesById(movie!.seriesId!),
    enabled: Boolean(movie?.seriesId),
  });
  const accessType = movie ? (movie.seriesId ? parentSeries?.accessType : movie.accessType) : undefined;
  const hasAccess = accessType === "FREE" || isSubscribed;

  const {
    data: streamInfo,
    error: streamError,
    isLoading: isStreamLoading,
  } = useQuery({
    queryKey: ["stream", movieId],
    queryFn: () => videoService.getStreamInfo(movieId),
    enabled: hasAccess,
    retry: false,
  });

  // Shares its query key with EpisodeRail's own fetch, so this adds no extra
  // network round trip — just lets the page itself know what comes next.
  const { data: playerEpisodes } = useQuery({
    queryKey: ["series", movie?.seriesId, "player-episodes"],
    queryFn: () => seriesService.getPlayerEpisodes(movie!.seriesId!),
    enabled: Boolean(movie?.seriesId),
  });
  const flatEpisodes = playerEpisodes?.seasons.flatMap((season) => season.episodes) ?? [];
  const currentEpisodeIndex = flatEpisodes.findIndex((episode) => episode.id === movieId);
  const nextEpisode = currentEpisodeIndex >= 0 ? flatEpisodes[currentEpisodeIndex + 1] : undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const prefetchRef = useRef<PrefetchHandle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedAt = useRef(0);
  const currentTimeRef = useRef(0);
  const videoClickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFragmentCountRef = useRef(0);
  const hudTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hudIdRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([{ label: "Auto", index: -1 }]);
  const [quality, setQuality] = useState("Auto");
  const [subtitle, setSubtitle] = useState("Off");
  const [audio, setAudio] = useState("Original");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<[number, number][]>([]);
  const [prefetchStatus, setPrefetchStatus] = useState<PrefetchStatusDisplay | null>(null);
  const [hud, setHud] = useState<HudMessage | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [upNextSeconds, setUpNextSeconds] = useState<number | null>(null);

  const networkQuality = useNetworkQuality({ hlsRef, isBuffering, loadedFragmentCountRef, active: hasStarted });

  /** Arms the auto-hide countdown without touching visibility, so mount can start
   *  the timer against the already-visible initial state instead of re-setting it. */
  const scheduleHide = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setControlsVisible(false), AUTO_HIDE_MS);
  }, []);

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  /** Flashes a confirmation in the middle of the picture — the only feedback a
   *  keyboard shortcut gets, since the control bar may well be hidden. */
  const showHud = useCallback((icon: LucideIcon, label?: string, meter?: number) => {
    hudIdRef.current += 1;
    setHud({ id: hudIdRef.current, icon, label, meter });
    if (hudTimeout.current) clearTimeout(hudTimeout.current);
    hudTimeout.current = setTimeout(() => setHud(null), HUD_VISIBLE_MS);
  }, []);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      if (hudTimeout.current) clearTimeout(hudTimeout.current);
    };
  }, [scheduleHide]);

  // Keeps the fullscreen icon correct even when fullscreen is entered/exited by
  // something other than our own button — e.g. the browser's own Esc handling.
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Set up HLS.js (or native HLS on Safari) once the real playlist URL is known.
  useEffect(() => {
    const video = videoRef.current;
    const playlistUrl = streamInfo?.playlistUrl;
    if (!video || !playlistUrl) return;

    loadedFragmentCountRef.current = 0;

    if (Hls.isSupported()) {
      // Our own SegmentManager/CacheManager/DownloadManager/PrefetchManager stack owns the
      // real ±10s sliding cache window; hls.js's fLoader is swapped for one backed by that
      // cache, so hls.js's own fragment requests transparently become cache hits once
      // PrefetchManager has already downloaded them.
      const prefetchSystem = createPrefetchSystem(
        { beforeSeconds: PREFETCH_BEFORE_SECONDS, afterSeconds: PREFETCH_AFTER_SECONDS },
        { maxConcurrentDownloads: 3, maxCacheEntries: 60 },
      );
      const hls = new Hls({
        fLoader: prefetchSystem.loaderClass,
        // Without a cap, hls.js's own congestion-avoidance logic will happily buffer minutes
        // ahead on a fast connection — keep its ambition aligned with our actual cache window
        // instead of racing ahead of what PrefetchManager is managing.
        maxBufferLength: PREFETCH_AFTER_SECONDS,
        maxMaxBufferLength: PREFETCH_AFTER_SECONDS,
        backBufferLength: PREFETCH_BEFORE_SECONDS,
      });
      hlsRef.current = hls;
      hls.loadSource(playlistUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const levels: QualityLevel[] = [
          { label: "Auto", index: -1 },
          ...data.levels
            .map((level, index) => ({ label: `${level.height}p`, index }))
            .sort((a, b) => b.index - a.index),
        ];
        setQualityLevels(levels);
        prefetchRef.current = prefetchSystem.attach(hls, video);
      });
      hls.on(Hls.Events.FRAG_LOADED, () => {
        loadedFragmentCountRef.current += 1;
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
          }
        }
      });

      return () => {
        prefetchRef.current?.destroy();
        prefetchRef.current = null;
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playlistUrl;
      return;
    }
  }, [streamInfo?.playlistUrl]);

  // Sync volume/speed to the actual media element.
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume / 100;
  }, [volume]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // Poll the real <video> buffered ranges + prefetch cache status so the UI can show
  // the user what the prefetch system is actually doing, not just a spinner.
  useEffect(() => {
    if (!hasStarted) return;
    const readStatus = () => {
      const video = videoRef.current;
      if (video) {
        const ranges: [number, number][] = [];
        for (let i = 0; i < video.buffered.length; i++) {
          ranges.push([video.buffered.start(i), video.buffered.end(i)]);
        }
        setBufferedRanges(ranges);
      }
      setPrefetchStatus(prefetchRef.current?.getStatus() ?? null);
    };
    readStatus();
    const interval = setInterval(readStatus, 500);
    return () => clearInterval(interval);
  }, [hasStarted, streamInfo?.playlistUrl]);

  const saveProgress = useCallback(
    (force = false) => {
      if (!movie || durationSeconds === 0) return;
      const now = Date.now();
      if (!force && now - lastSavedAt.current < PROGRESS_SAVE_INTERVAL_MS) return;
      lastSavedAt.current = now;
      const time = currentTimeRef.current;
      const percent = Math.min(100, Math.round((time / durationSeconds) * 100));
      historyService.updateProgress(movie.id, percent, Math.round(time)).catch(() => {});
    },
    [movie, durationSeconds],
  );

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => saveProgress(), PROGRESS_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);

  useEffect(() => {
    return () => saveProgress(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToEpisode = useCallback(
    (episodeId: string) => {
      router.push(`/player/${episodeId}`);
    },
    [router],
  );

  // Auto-advance countdown, ticking one second at a time so the ring in
  // UpNextOverlay can animate against it.
  useEffect(() => {
    if (upNextSeconds === null) return;
    if (upNextSeconds <= 0) {
      if (nextEpisode) goToEpisode(nextEpisode.id);
      return;
    }
    const timer = setTimeout(() => setUpNextSeconds((seconds) => (seconds === null ? null : seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [upNextSeconds, nextEpisode, goToEpisode]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  // A double-click always fires two native `click` events before the browser
  // recognizes it as one — without this, each click's handler actually runs twice,
  // producing a visible stutter right as the video switches to fullscreen. Delaying
  // the single-click action briefly, and cancelling it if a second click lands within
  // that window, keeps a real single click responsive while letting a double-click go
  // straight to fullscreen with no side effect from the single-click path at all.
  const VIDEO_CLICK_DELAY_MS = 250;

  const handleVideoClick = () => {
    if (videoClickTimeout.current) return;
    videoClickTimeout.current = setTimeout(() => {
      videoClickTimeout.current = null;
      // A single click/tap anywhere on the picture is play/pause — the gesture the
      // player has always had, on mouse and on touch alike. It also wakes the control
      // bar and re-arms auto-hide, which is the only way a touch device (no hover, so
      // no onMouseMove) can bring the controls back once they've faded.
      togglePlay();
      resetHideTimer();
    }, VIDEO_CLICK_DELAY_MS);
  };

  const handleVideoDoubleClick = () => {
    if (videoClickTimeout.current) {
      clearTimeout(videoClickTimeout.current);
      videoClickTimeout.current = null;
    }
    toggleFullscreen();
  };

  useEffect(() => {
    return () => {
      if (videoClickTimeout.current) clearTimeout(videoClickTimeout.current);
    };
  }, []);

  // Optimistically move the reported position immediately instead of waiting on the
  // browser's own `timeupdate` event, which on a slow connection can lag well behind
  // the moment the user actually dragged/skipped — otherwise the seek bar and clock
  // appear stuck at the old spot until buffering at the new position catches up.
  const applySeek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const clamped = Math.min(durationSeconds, Math.max(0, time));
      video.currentTime = clamped;
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);
    },
    [durationSeconds],
  );

  const handleSkip = useCallback(
    (deltaSeconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      applySeek(video.currentTime + deltaSeconds);
    },
    [applySeek],
  );

  const handleQualityChange = (label: string) => {
    const level = qualityLevels.find((l) => l.label === label);
    if (level && hlsRef.current) {
      hlsRef.current.currentLevel = level.index;
      setQuality(label);
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Every shortcut confirms itself on screen and wakes the control bar, so the
  // keyboard never feels like it's doing something invisible.
  usePlayerHotkeys(hasAccess && Boolean(streamInfo), {
    onTogglePlay: () => {
      const willPlay = videoRef.current?.paused ?? false;
      togglePlay();
      showHud(willPlay ? Play : Pause);
      resetHideTimer();
    },
    onSeekBy: (delta) => {
      handleSkip(delta);
      showHud(delta > 0 ? FastForward : Rewind, `${delta > 0 ? "+" : ""}${delta}s`);
      resetHideTimer();
    },
    onSeekToFraction: (fraction) => {
      if (durationSeconds <= 0) return;
      const target = fraction * durationSeconds;
      applySeek(target);
      showHud(FastForward, formatTimecode(target));
      resetHideTimer();
    },
    onVolumeBy: (delta) => {
      const next = Math.min(100, Math.max(0, volume + delta));
      setVolume(next);
      if (next > 0 && isMuted) setIsMuted(false);
      showHud(next === 0 ? VolumeX : next < 50 ? Volume1 : Volume2, `${next}%`, next);
      resetHideTimer();
    },
    onToggleMute: () => {
      const next = !isMuted;
      setIsMuted(next);
      showHud(next ? VolumeX : volume < 50 ? Volume1 : Volume2, next ? "Muted" : `${volume}%`);
      resetHideTimer();
    },
    onToggleFullscreen: toggleFullscreen,
    onToggleTheater: () => setIsTheater((theater) => !theater),
    onNextEpisode: nextEpisode ? () => goToEpisode(nextEpisode.id) : undefined,
  });

  if (isLoading) return <PageLoader />;

  if (!movie) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <EmptyState
          icon={Clapperboard}
          title={t.player.state.notFound}
          action={
            <Button render={<Link href="/" />} nativeButton={false}>
              {t.player.state.backHome}
            </Button>
          }
        />
      </div>
    );
  }

  const notReadyYet = streamError instanceof ApiError && streamError.status === 404;
  const backHref = movie.seriesId ? `/series/${movie.seriesId}` : `/movie/${movie.id}`;
  const inWatchlist = isInWatchlist(movie.id);
  const hasEpisodeNumbers = movie.seriesId && movie.seasonNumber != null && movie.episodeNumber != null;
  const posterUrl = movie.coverUrl ?? FALLBACK_COVER_URL;
  const showRail = Boolean(movie.seriesId);
  const similarItems = (similarMovies ?? []).map((m) => movieToBrowseItem(m, formatDuration(m.duration)));
  // The bar has to survive a drag and an open menu, and there's no reason to hide
  // it from a paused picture — nobody is watching anything at that moment.
  const showControls = controlsVisible || !isPlaying || isScrubbing || isMenuOpen;

  return (
    <div className="relative flex min-h-screen flex-col">
      <AmbientBackdrop videoRef={videoRef} posterUrl={posterUrl} active={hasStarted} />

      <main
        className={cn(
          "mx-auto w-full flex-1 pb-8 lg:px-8 lg:pt-6",
          isTheater ? "max-w-[1920px]" : "max-w-[1600px]",
        )}
      >
        <div
          className={cn(
            "lg:grid lg:items-start lg:gap-6",
            showRail && !isTheater
              ? "lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_23rem]"
              : "lg:grid-cols-1",
          )}
        >
          <div className="flex min-w-0 flex-col gap-5">
            <div
              ref={containerRef}
              onMouseMove={resetHideTimer}
              className={cn(
                "relative aspect-video w-full shrink-0 overflow-hidden bg-black",
                "lg:rounded-3xl lg:shadow-[0_32px_90px_-24px_rgba(0,0,0,0.95)] lg:ring-1 lg:ring-white/10 lg:ring-inset",
                // A cursor hovering over a playing film is just clutter.
                !showControls && isPlaying && "cursor-none",
              )}
            >
              {!hasStarted && (
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 70vw"
                  className="object-cover opacity-45"
                />
              )}

              <video
                ref={videoRef}
                className={cn(
                  "absolute inset-0 size-full object-contain transition-opacity duration-500",
                  hasStarted ? "opacity-100" : "opacity-0",
                  hasAccess && "cursor-pointer",
                )}
                playsInline
                onClick={hasAccess ? handleVideoClick : undefined}
                onDoubleClick={hasAccess ? handleVideoDoubleClick : undefined}
                onPlay={() => {
                  setIsPlaying(true);
                  setHasStarted(true);
                  setUpNextSeconds(null);
                }}
                onPause={() => setIsPlaying(false)}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onCanPlay={() => setIsBuffering(false)}
                onTimeUpdate={(e) => {
                  currentTimeRef.current = e.currentTarget.currentTime;
                  setCurrentTime(e.currentTarget.currentTime);
                }}
                onLoadedMetadata={(e) => setDurationSeconds(e.currentTarget.duration)}
                onEnded={() => {
                  saveProgress(true);
                  if (nextEpisode) setUpNextSeconds(UP_NEXT_COUNTDOWN_SECONDS);
                }}
              />

              <div
                className={cn(
                  "absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/85 via-black/35 to-transparent p-3 pr-14 pb-14 transition-opacity duration-300 ease-out sm:p-4 sm:pr-16 sm:pb-16",
                  showControls ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 rounded-full bg-black/40 text-white ring-1 ring-white/12 backdrop-blur-xl ring-inset hover:bg-white/20 hover:text-white"
                  render={<Link href={backHref} />}
                  nativeButton={false}
                  onClick={() => {
                    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
                  }}
                  aria-label={t.common.back}
                >
                  <ArrowLeft className="size-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  {movie.seriesId && parentSeries && (
                    <p className="truncate text-[10px] leading-none font-semibold tracking-[0.18em] text-white/55 uppercase">
                      {parentSeries.title}
                    </p>
                  )}
                  <p className="mt-1 truncate font-heading text-sm font-semibold tracking-tight text-white sm:text-base">
                    {movie.title}
                  </p>
                </div>
              </div>

              {hasStarted && <NetworkStatusIcon quality={networkQuality} />}

              <PlayerHud message={hud} />

              {hasAccess ? (
                isStreamLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="size-9 animate-spin text-white/80" />
                  </div>
                ) : notReadyYet ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center backdrop-blur-md">
                    <div className="flex size-14 items-center justify-center rounded-full bg-white/8 text-white ring-1 ring-white/12 ring-inset">
                      <Loader2 className="size-6 animate-spin" />
                    </div>
                    <div>
                      <p className="font-heading text-lg font-semibold tracking-tight text-white">
                        {t.player.state.processingTitle}
                      </p>
                      <p className="mt-1.5 max-w-sm text-sm text-white/70">{t.player.state.processingBody}</p>
                    </div>
                  </div>
                ) : streamError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center backdrop-blur-md">
                    <div className="flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-1 ring-destructive/25 ring-inset">
                      <AlertTriangle className="size-6" />
                    </div>
                    <p className="max-w-sm text-sm text-white/70">
                      {streamError instanceof ApiError ? streamError.message : t.player.state.playbackError}
                    </p>
                  </div>
                ) : (
                  <>
                    {!isPlaying && !isBuffering && upNextSeconds === null && (
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="group absolute inset-0 flex items-center justify-center outline-none"
                        aria-label={t.player.meta.play}
                      >
                        <span className="flex size-16 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-[0_10px_45px_rgba(0,0,0,0.55)] ring-4 ring-white/10 transition-[transform,background-color] duration-200 ease-out group-hover:scale-105 group-hover:bg-primary group-focus-visible:scale-105 group-active:scale-95 sm:size-20">
                          <Play className="size-7 translate-x-0.5 fill-current sm:size-9" />
                        </span>
                      </button>
                    )}

                    {isBuffering && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <Loader2 className="size-10 animate-spin text-white/85" />
                      </div>
                    )}

                    {upNextSeconds !== null && nextEpisode && (
                      <UpNextOverlay
                        episode={nextEpisode}
                        secondsRemaining={upNextSeconds}
                        totalSeconds={UP_NEXT_COUNTDOWN_SECONDS}
                        onPlayNow={() => goToEpisode(nextEpisode.id)}
                        onCancel={() => setUpNextSeconds(null)}
                      />
                    )}

                    <div
                      className={cn(
                        "absolute inset-x-0 bottom-0 z-10 transition-opacity duration-300",
                        showControls ? "opacity-100" : "pointer-events-none opacity-0",
                      )}
                    >
                      <PlayerControls
                        isPlaying={isPlaying}
                        onTogglePlay={togglePlay}
                        currentTimeSeconds={currentTime}
                        durationSeconds={durationSeconds}
                        onSeek={applySeek}
                        onSkip={handleSkip}
                        onScrubbingChange={setIsScrubbing}
                        bufferedRanges={bufferedRanges}
                        prefetchStatus={prefetchStatus}
                        volume={volume}
                        onVolumeChange={setVolume}
                        isMuted={isMuted}
                        onToggleMute={() => setIsMuted((m) => !m)}
                        isFullscreen={isFullscreen}
                        onToggleFullscreen={toggleFullscreen}
                        isTheater={isTheater}
                        onToggleTheater={() => setIsTheater((theater) => !theater)}
                        speed={speed}
                        onSpeedChange={setSpeed}
                        qualityOptions={qualityLevels.map((l) => l.label)}
                        quality={quality}
                        onQualityChange={handleQualityChange}
                        subtitle={subtitle}
                        onSubtitleChange={setSubtitle}
                        audio={audio}
                        onAudioChange={setAudio}
                        fullscreenContainerRef={containerRef}
                        onNextEpisode={nextEpisode ? () => goToEpisode(nextEpisode.id) : undefined}
                        onMenuOpenChange={setIsMenuOpen}
                      />
                    </div>
                  </>
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center backdrop-blur-md">
                  <div className="flex size-14 items-center justify-center rounded-full bg-premium/15 text-premium ring-1 ring-premium/30 ring-inset">
                    <Lock className="size-6" />
                  </div>
                  <div>
                    <p className="font-heading text-lg font-semibold tracking-tight text-white">
                      {t.player.state.lockedTitle}
                    </p>
                    <p className="mt-1.5 max-w-sm text-sm text-white/70">
                      {movie.seriesId
                        ? t.player.state.lockedEpisodeBody
                        : t.player.state.lockedMovieBody(movie.title)}
                    </p>
                  </div>
                  <Button className="h-11 rounded-full px-5" onClick={() => setSubscribeOpen(true)}>
                    <Sparkles className="size-4" />
                    {t.player.state.subscribe}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 px-4 sm:px-6 lg:px-0">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0">
                  {movie.seriesId && parentSeries ? (
                    <Link
                      href={`/series/${movie.seriesId}`}
                      className="focus-ring rounded-sm text-[11px] font-semibold tracking-[0.18em] text-primary uppercase transition-colors duration-150 ease-out hover:text-primary/80"
                    >
                      {parentSeries.title}
                    </Link>
                  ) : (
                    <Kicker>{t.nav.movies}</Kicker>
                  )}
                  <h1 className="mt-1.5 text-title">{movie.title}</h1>
                  {hasEpisodeNumbers && (
                    <p className="mt-1.5 text-sm text-muted-foreground nums">
                      {t.player.meta.seasonEpisode(movie.seasonNumber!, movie.episodeNumber!)}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleWatchlist(movie.id)}
                    aria-pressed={inWatchlist}
                    className={cn(
                      "focus-ring flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium ring-1 backdrop-blur-md transition-colors duration-150 ease-out ring-inset",
                      inWatchlist
                        ? "bg-primary/20 text-foreground ring-primary/50"
                        : "bg-white/8 text-white ring-white/20 hover:bg-white/15",
                    )}
                  >
                    {inWatchlist ? <Check className="size-4" /> : <Plus className="size-4" />}
                    {inWatchlist ? t.player.meta.inWatchlist : t.player.meta.addToWatchlist}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    aria-label={t.player.meta.share}
                    className="focus-ring flex size-11 items-center justify-center rounded-full bg-white/8 text-white ring-1 ring-white/20 backdrop-blur-md transition-colors duration-150 ease-out ring-inset hover:bg-white/15"
                  >
                    <Share2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {accessType && <AccessBadge accessType={accessType} />}
                {movie.rating > 0 && (
                  <Chip tone="premium" size="sm" className="font-semibold">
                    <Star className="fill-current" />
                    <span className="nums">{movie.rating.toFixed(1)}</span>
                  </Chip>
                )}
                <Chip tone="neutral" size="sm" variant="outline">
                  <Calendar />
                  <span className="nums">{movie.releaseYear}</span>
                </Chip>
                <Chip tone="neutral" size="sm" variant="outline">
                  <Clock />
                  <span className="nums">{formatDuration(movie.duration)}</span>
                </Chip>
                <Chip tone="neutral" size="sm" variant="outline">
                  {movie.genre}
                </Chip>
                {movie.categories.map((category) => (
                  <Chip key={category.id} tone="neutral" size="sm" variant="outline">
                    {category.name}
                  </Chip>
                ))}
              </div>

              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{movie.description}</p>

              <p className="hidden text-xs text-muted-foreground/60 lg:block">{t.player.meta.shortcutsHint}</p>
            </div>
          </div>

          {showRail && (
            // top-[4.5rem] clears the sticky h-14 context bar above the player.
            <div className={cn("px-4 sm:px-6 lg:px-0", isTheater ? "mt-6" : "lg:sticky lg:top-[4.5rem]")}>
              <EpisodeRail
                seriesId={movie.seriesId!}
                currentEpisodeId={movie.id}
                variant={isTheater ? "inline" : "sidebar"}
              />
            </div>
          )}
        </div>

        {similarItems.length > 0 || isSimilarLoading ? (
          // -mx-8 cancels main's lg:px-8 so the rail's own px-8 lines its
          // heading up with the player content while the scroller still
          // bleeds to the container edge, matching the movies page.
          <div className="mt-8 lg:-mx-8">
            <PosterRail title={t.player.meta.recommended} items={similarItems} isLoading={isSimilarLoading} />
          </div>
        ) : null}
      </main>

      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={movie.title}
        url={typeof window !== "undefined" ? window.location.href : ""}
      />
    </div>
  );
}
