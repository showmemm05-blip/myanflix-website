"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import Hls from "hls.js";
import { AlertTriangle, ArrowLeft, Clapperboard, Loader2, Lock, Play, ShoppingBag } from "lucide-react";
import { PlayerControls } from "@/components/player/PlayerControls";
import { MovieRow } from "@/components/movie/MovieRow";
import { PageLoader } from "@/components/loading/Spinner";
import { EmptyState } from "@/components/empty/EmptyState";
import { PurchaseDialog } from "@/components/dialogs/PurchaseDialog";
import { Button } from "@/components/ui/button";
import { useMovie, useSimilarMovies } from "@/hooks/use-movies";
import { useLibrary } from "@/lib/context/library-context";
import { historyService } from "@/services/api/historyService";
import { videoService } from "@/services/api/videoService";
import { ApiError } from "@/services/api/apiClient";
import { createPrefetchSystem, type PrefetchHandle } from "@/lib/streaming/PrefetchController";
import type { PrefetchStatusDisplay } from "@/components/player/PlayerControls";
import { formatDuration } from "@/lib/format";
import { FALLBACK_COVER_URL } from "@/lib/placeholder";

const AUTO_HIDE_MS = 3000;
const PROGRESS_SAVE_INTERVAL_MS = 8000;
// Sliding cache window: how much video stays prefetched/cached around the current playback position.
const PREFETCH_BEFORE_SECONDS = 10;
const PREFETCH_AFTER_SECONDS = 10;

interface QualityLevel {
  label: string;
  index: number; // -1 for Auto
}

function formatClock(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function PlayerPage({ params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = use(params);
  const { data: movie, isLoading } = useMovie(movieId);
  const { data: similarMovies } = useSimilarMovies(movieId);
  const { isPurchased } = useLibrary();
  const owned = movie ? isPurchased(movie.id) : false;

  const {
    data: streamInfo,
    error: streamError,
    isLoading: isStreamLoading,
  } = useQuery({
    queryKey: ["stream", movieId],
    queryFn: () => videoService.getStreamInfo(movieId),
    enabled: owned,
    retry: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const prefetchRef = useRef<PrefetchHandle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedAt = useRef(0);
  const currentTimeRef = useRef(0);
  const videoClickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([{ label: "Auto", index: -1 }]);
  const [quality, setQuality] = useState("Auto");
  const [subtitle, setSubtitle] = useState("Off");
  const [audio, setAudio] = useState("Original");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<[number, number][]>([]);
  const [prefetchStatus, setPrefetchStatus] = useState<PrefetchStatusDisplay | null>(null);

  const progress = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0;

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setControlsVisible(false), AUTO_HIDE_MS);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [resetHideTimer]);

  // Set up HLS.js (or native HLS on Safari) once the real playlist URL is known.
  useEffect(() => {
    const video = videoRef.current;
    const playlistUrl = streamInfo?.playlistUrl;
    if (!video || !playlistUrl) return;

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

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  // A double-click always fires two native `click` events before the browser
  // recognizes it as one — without this, each click's togglePlay() actually
  // runs (pause, then resume), producing a visible stutter right as the video
  // switches to fullscreen. Delaying the single-click action briefly, and
  // cancelling it if a second click lands within that window, keeps a real
  // single click responsive while letting a double-click go straight to
  // fullscreen with no play/pause side effect at all.
  const VIDEO_CLICK_DELAY_MS = 250;

  const handleVideoClick = () => {
    if (videoClickTimeout.current) return;
    videoClickTimeout.current = setTimeout(() => {
      videoClickTimeout.current = null;
      togglePlay();
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
  const applySeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.min(durationSeconds, Math.max(0, time));
    video.currentTime = clamped;
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
  };

  const handleSeek = (percent: number) => {
    if (durationSeconds === 0) return;
    applySeek((percent / 100) * durationSeconds);
  };

  const handleSkip = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    applySeek(video.currentTime + deltaSeconds);
  };

  const handleQualityChange = (label: string) => {
    const level = qualityLevels.find((l) => l.label === label);
    if (level && hlsRef.current) {
      hlsRef.current.currentLevel = level.index;
      setQuality(label);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  if (isLoading) return <PageLoader />;

  if (!movie) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <EmptyState
          icon={Clapperboard}
          title="Movie not found"
          action={
            <Button render={<Link href="/" />} nativeButton={false}>
              Back to Home
            </Button>
          }
        />
      </div>
    );
  }

  const notReadyYet = streamError instanceof ApiError && streamError.status === 404;

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div ref={containerRef} onMouseMove={resetHideTimer} className="relative aspect-video w-full bg-black">
        {!hasStarted && (
          <Image
            src={movie.coverUrl ?? FALLBACK_COVER_URL}
            alt={movie.title}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-60"
          />
        )}

        <video
          ref={videoRef}
          className={`absolute inset-0 size-full ${hasStarted ? "opacity-100" : "opacity-0"} ${owned ? "cursor-pointer" : ""}`}
          playsInline
          onClick={owned ? handleVideoClick : undefined}
          onDoubleClick={owned ? handleVideoDoubleClick : undefined}
          onPlay={() => {
            setIsPlaying(true);
            setHasStarted(true);
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
          onEnded={() => saveProgress(true)}
        />

        <div
          className={`absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0"}`}
        >
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            render={<Link href={`/movie/${movie.id}`} />}
            nativeButton={false}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <p className="truncate text-sm font-medium text-white">{movie.title}</p>
        </div>

        {owned ? (
          isStreamLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-8 animate-spin text-white/80" />
            </div>
          ) : notReadyYet ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-white/10 text-white">
                <Loader2 className="size-6 animate-spin" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Still processing</p>
                <p className="mt-1 text-sm text-white/70">
                  This movie is still being prepared for streaming. Check back shortly.
                </p>
              </div>
            </div>
          ) : streamError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                <AlertTriangle className="size-6" />
              </div>
              <p className="text-sm text-white/70">
                {streamError instanceof ApiError ? streamError.message : "Couldn't load this video."}
              </p>
            </div>
          ) : (
            <>
              {!isPlaying && !isBuffering && (
                <button
                  type="button"
                  onClick={handleVideoClick}
                  onDoubleClick={handleVideoDoubleClick}
                  className="absolute inset-0 flex items-center justify-center"
                  aria-label="Play"
                >
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-2xl transition-transform hover:scale-105">
                    <Play className="size-7 fill-current" />
                  </span>
                </button>
              )}
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-10 animate-spin text-white/80" />
                </div>
              )}

              <div
                className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${controlsVisible || !isPlaying ? "opacity-100" : "opacity-0"}`}
              >
                <PlayerControls
                  isPlaying={isPlaying}
                  onTogglePlay={togglePlay}
                  progress={progress}
                  onSeek={handleSeek}
                  onSkip={handleSkip}
                  currentTime={formatClock(currentTime)}
                  duration={formatClock(durationSeconds)}
                  durationSeconds={durationSeconds}
                  bufferedRanges={bufferedRanges}
                  prefetchStatus={prefetchStatus}
                  volume={volume}
                  onVolumeChange={setVolume}
                  isMuted={isMuted}
                  onToggleMute={() => setIsMuted((m) => !m)}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={toggleFullscreen}
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
                />
              </div>
            </>
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 p-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-white/10 text-white">
              <Lock className="size-6" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Buy this movie to watch</p>
              <p className="mt-1 text-sm text-white/70">{movie.title} isn&rsquo;t in your library yet.</p>
            </div>
            <Button onClick={() => setPurchaseOpen(true)}>
              <ShoppingBag className="size-4" />
              Buy Now
            </Button>
          </div>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{movie.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {movie.releaseYear} &middot; {formatDuration(movie.duration)}
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{movie.description}</p>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Episodes</h2>
          <EmptyState
            icon={Clapperboard}
            title="This is a standalone movie"
            description="Episode support is coming soon for series content."
          />
        </div>
      </div>

      <MovieRow title="Recommended Movies" movies={similarMovies ?? []} />

      <PurchaseDialog movie={movie} open={purchaseOpen} onOpenChange={setPurchaseOpen} />
    </div>
  );
}
