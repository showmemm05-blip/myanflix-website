"use client";

import { memo, use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Hls from "hls.js";
import {
  PlayerControls,
  SpeedQualityMenu,
  SUBTITLES_OFF,
  type PrefetchStatusDisplay,
  type SubtitleTrackOption,
} from "@/components/player/PlayerControls";
import {
  SubtitleOverlay,
  loadSubtitleStyle,
  saveSubtitleStyle,
  type SubtitleStyleSettings,
} from "@/components/player/SubtitleOverlay";
import { AmbientBackdrop } from "@/components/player/AmbientBackdrop";
import { PlayerHud, type HudMessage } from "@/components/player/PlayerHud";
import { EpisodeRail } from "@/components/player/EpisodeRail";
import { UpNextOverlay } from "@/components/player/UpNextOverlay";
import { NetworkStatusIcon } from "@/components/player/NetworkStatusIcon";
import {
  BackChevronIcon,
  ForwardIcon,
  HourglassIcon,
  MutedIcon,
  NoVideoIcon,
  PauseGlyph,
  PlayGlyph,
  ReplayIcon,
  SignInIcon,
  VolumeIcon,
  VolumeLowIcon,
  WarningIcon,
} from "@/components/player/player-icons";
import styles from "@/components/player/player.module.css";
import { movieToBrowseItem } from "@/components/browse/browse-item";
import { PageLoader } from "@/components/loading/Spinner";
import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { ShareDialog } from "@/components/modals/ShareDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AccessBadge,
  Artwork,
  CheckIcon,
  CrownIcon,
  LockIcon,
  MediaCard,
  PlusIcon,
  Rating,
  Row,
  RowSkeleton,
  ShareIcon,
} from "@/components/system";
import { useMovie, useSimilarMovies } from "@/hooks/use-movies";
import { useAuth } from "@/lib/context/auth-context";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { loginHref } from "@/lib/auth/return-to";
import { seriesService } from "@/services/api/seriesService";
import { historyService } from "@/services/api/historyService";
import { videoService } from "@/services/api/videoService";
import { ApiError } from "@/services/api/apiClient";
import { createPrefetchSystem, type PrefetchHandle } from "@/lib/streaming/PrefetchController";
import { useNetworkQuality } from "@/lib/hooks/use-network-quality";
import { usePlayerHotkeys } from "@/lib/hooks/use-player-hotkeys";
import { formatDuration, formatTimecode } from "@/lib/format";
import { parseStartSeconds, START_PARAM, usableStartSeconds } from "@/lib/player/resume";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";

const AUTO_HIDE_MS = 3000;
const PROGRESS_SAVE_INTERVAL_MS = 8000;
const HUD_VISIBLE_MS = 800;
const UP_NEXT_COUNTDOWN_SECONDS = 8;
// Sliding cache window: how much video stays prefetched/cached around the current playback position.
// 30 s ahead (hls.js's own default) gives a weak mobile link a real cushion before a
// "Buffering" stall; behind the playhead only what is already cached is kept.
const PREFETCH_BEFORE_SECONDS = 10;
const PREFETCH_AFTER_SECONDS = 30;
// hls.js's first bandwidth guess, in bits/sec. Without it hls.js assumes the speed of
// the first variant in the master playlist (1080p, ~5 Mbps), so every title opened at
// 720p+ even on a slow phone link. 1 Mbps starts low and ABR climbs within a few
// segments on a fast link. Not lower: PrefetchController switches background prefetch
// off below exactly 1 Mbps (LOW_BANDWIDTH_BPS).
const START_BANDWIDTH_ESTIMATE_BPS = 1_000_000;
/** How often the buffered-ranges / cache readout is refreshed while playing. */
const STATUS_POLL_MS = 500;
/** While paused the picture is still, but the prefetcher can still be finishing
 *  downloads, so the "Caching / Cached" line keeps refreshing — just less often. */
const PAUSED_STATUS_POLL_MS = 2000;

function sameRanges(a: [number, number][], b: [number, number][]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
}

function samePrefetchStatus(a: PrefetchStatusDisplay | null, b: PrefetchStatusDisplay | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.downloadedCount === b.downloadedCount &&
    a.downloadingCount === b.downloadingCount &&
    a.queuedCount === b.queuedCount &&
    a.cachedRangeStart === b.cachedRangeStart &&
    a.cachedRangeEnd === b.cachedRangeEnd
  );
}

interface QualityLevel {
  label: string;
  index: number; // -1 for Auto
}

/**
 * A subtitle rendition as the engine reports it, before the menu label is
 * resolved. The name is kept raw so switching UI language relabels the menu
 * without having to tear down and rebuild the playback engine.
 */
interface SubtitleTrackInfo {
  index: number;
  name: string;
}

/**
 * Safari's native HLS engine surfaces the manifest's subtitle renditions as
 * TextTracks on the element itself. Metadata and chapter tracks ride the same
 * list and are not viewer-facing, so only these two kinds make the menu.
 */
function subtitleTextTracks(textTracks: TextTrackList): TextTrack[] {
  return Array.from(textTracks).filter((track) => track.kind === "subtitles" || track.kind === "captions");
}

/**
 * The active cue text, ready for the custom overlay — the browser's own
 * renderer is deliberately bypassed (see SubtitleOverlay) because it cannot
 * wrap to a chosen width, resize per-user, or clear our control bar. WebVTT
 * cue text can carry inline markup (`<i>`, `<b>`, timestamp tags); the overlay
 * renders plain text, so those are stripped rather than shown raw.
 */
function activeCueLines(track: TextTrack | undefined | null): string[] {
  const cues = track?.activeCues;
  if (!cues) return [];
  return Array.from(cues)
    .map((cue) => (cue instanceof VTTCue ? cue.text.replace(/<[^>]+>/g, "").trim() : ""))
    .filter((text) => text.length > 0);
}

/**
 * The subtitle TextTrack the given engine index refers to, or null. hls.js and
 * Safari both create one native TextTrack per manifest subtitle rendition, in
 * manifest order, so the engine's track index is the index into the
 * subtitle-kind tracks.
 */
function subtitleTrackAt(video: HTMLVideoElement, index: number): TextTrack | null {
  if (index < 0) return null;
  return subtitleTextTracks(video.textTracks)[index] ?? null;
}

/**
 * The "More like this" row under the player. Its own memoised component so the
 * page's 4-per-second clock updates during playback don't re-render a row of
 * cards whose data never changes mid-title — it renders again only when the
 * similar-titles query (or the UI language) does.
 */
const SimilarTitlesRow = memo(function SimilarTitlesRow({
  movies,
  isLoading,
}: {
  movies: Movie[] | undefined;
  isLoading: boolean;
}) {
  const { t } = useLanguage();
  const p = useSection(playText);
  const items = (movies ?? []).map((m) => movieToBrowseItem(m, formatDuration(m.duration)));
  if (items.length === 0 && !isLoading) return null;
  return (
    <div className="mt-[clamp(40px,4vw,56px)]">
      {isLoading ? (
        <RowSkeleton kind="poster" />
      ) : (
        <Row title={t.player.meta.recommended} subtitle={p.moreLikeThisSubtitle}>
          {items.map((item) => (
            <MediaCard key={item.id} item={item} layout="rail" sizes="184px" />
          ))}
        </Row>
      )}
    </div>
  );
});

export default function PlayerPage({ params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const p = useSection(playText);
  const { data: movie, isLoading } = useMovie(movieId);
  const { data: similarMovies, isLoading: isSimilarLoading } = useSimilarMovies(movieId);
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Episodes inherit access from their parent series' own accessType —
  // per-episode access never exists.
  const { data: parentSeries } = useQuery({
    queryKey: ["series", movie?.seriesId],
    queryFn: () => seriesService.getSeriesById(movie!.seriesId!),
    enabled: Boolean(movie?.seriesId),
  });
  const accessType = movie ? (movie.seriesId ? parentSeries?.accessType : movie.accessType) : undefined;
  const hasAccess = accessType === "FREE" || isSubscribed;
  // Everything under /videos/* is members-only: a guest never asks for the
  // stream, never saves progress, and gets the sign-in wall instead of the
  // subscribe wall — whatever the title's access type says.
  const isGuest = !isAuthenticated && !isAuthLoading;
  const canWatch = isAuthenticated && hasAccess;

  const queryClient = useQueryClient();
  const {
    data: streamInfo,
    error: streamError,
    isLoading: isStreamLoading,
  } = useQuery({
    queryKey: ["stream", movieId],
    queryFn: () => videoService.getStreamInfo(movieId),
    enabled: canWatch,
    retry: false,
    // The playlist URL carries an expiring signed token, and the player
    // effect below is keyed on that URL: any background refetch that came
    // back with a fresher token would tear hls.js down and restart the title
    // from 0:00 mid-sitting. So the URL is fetched once and only replaced on
    // purpose — by the 403/410 recovery in the error handler. (Window-focus
    // refetching is already off globally; reconnect refetching is not.)
    staleTime: Infinity,
    refetchOnReconnect: false,
  });
  /**
   * Where playback was when a signed link was found expired (410) or
   * rejected (403). The recovery fetches a fresh link, which rebuilds the
   * player; this is how the rebuild knows to pick up from the same second
   * instead of the start.
   */
  const resumePositionRef = useRef<number | null>(null);
  /**
   * H-27: the second "Resume" / "Continue watching" asked playback to start
   * at (`?t=`, the backend's saved position), unless that is already in the
   * last 5%. Taken ONCE, by the first player built for this title; the
   * expired-link rebuild goes by resumePositionRef instead.
   */
  const requestedStart = parseStartSeconds(searchParams.get(START_PARAM));
  const requestedStartRef = useRef<number | null>(null);
  const movieDurationSeconds = movie?.duration ? movie.duration * 60 : null;
  // Declared before the player effect below so, in a commit where both
  // run, the start is already in place when the player is built.
  useEffect(() => {
    requestedStartRef.current = usableStartSeconds(requestedStart, movieDurationSeconds);
  }, [movieId, requestedStart, movieDurationSeconds]);

  // Shares its query key with EpisodeRail's own fetch, so this adds no extra
  // network round trip — just lets the page itself know what comes next.
  const { data: playerEpisodes } = useQuery({
    queryKey: ["series", movie?.seriesId, "player-episodes"],
    queryFn: () => seriesService.getPlayerEpisodes(movie!.seriesId!),
    // Members-only on the API; a guest sees the sign-in wall instead.
    enabled: Boolean(movie?.seriesId) && isAuthenticated,
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
  /**
   * The signed link was refused and a fresh one could not be had (the API
   * returned the same link, or the refetch itself failed). Terminal for this
   * player instance — shows the playback-error overlay instead of retrying.
   */
  const [playbackFailed, setPlaybackFailed] = useState(false);
  // Theater = the full-window stage with the episode panel floating over it
  // (the approved board's default); off = the framed video with the list
  // beside it, as the website used to open. T or the control-row button
  // switches between them.
  const [isTheater, setIsTheater] = useState(true);
  /** The episode panel (series only) — open by default, as the list always was. */
  const [isRailOpen, setIsRailOpen] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([{ label: "Auto", index: -1 }]);
  const [quality, setQuality] = useState("Auto");
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrackInfo[]>([]);
  const [subtitleTrack, setSubtitleTrack] = useState<number>(SUBTITLES_OFF);
  const [subtitleLines, setSubtitleLines] = useState<string[]>([]);
  // Lazy initializer, not an effect: loadSubtitleStyle() already returns the
  // defaults when there's no window, and the overlay renders nothing until a
  // cue is active — so the restored value can never differ from what the
  // server rendered (which is nothing at all).
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyleSettings>(loadSubtitleStyle);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<[number, number][]>([]);
  const [prefetchStatus, setPrefetchStatus] = useState<PrefetchStatusDisplay | null>(null);
  const [hud, setHud] = useState<HudMessage | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  // The bottom row's Subtitles & audio pop-up and the top row's speed/quality
  // pop-up each report in; either one holds the controls open.
  const [isControlsMenuOpen, setIsControlsMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const isMenuOpen = isControlsMenuOpen || isSpeedMenuOpen;
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
  const showHud = useCallback((icon: HudMessage["icon"], label?: string, meter?: number) => {
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

  const updateSubtitleStyle = useCallback((next: SubtitleStyleSettings) => {
    setSubtitleStyle(next);
    saveSubtitleStyle(next);
  }, []);

  // Mirror the active track's cues into React state. `cuechange` is the only
  // signal for this — it fires on the TextTrack itself regardless of whether
  // the browser is painting the cues, which is exactly the mode we put it in.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const track = subtitleTrackAt(video, subtitleTrack);
    if (!track) {
      setSubtitleLines([]);
      return;
    }

    // `hidden` keeps cue timing alive while suppressing the native renderer;
    // `showing` would double-draw underneath our overlay.
    track.mode = "hidden";
    const sync = () => setSubtitleLines(activeCueLines(track));
    sync();
    track.addEventListener("cuechange", sync);
    return () => {
      track.removeEventListener("cuechange", sync);
    };
  }, [subtitleTrack, streamInfo?.playlistUrl]);

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
    // Whatever the previous source advertised is gone the moment the URL changes.
    setSubtitleTracks([]);
    setSubtitleTrack(SUBTITLES_OFF);
    setSubtitleLines([]);
    setPlaybackFailed(false);

    if (Hls.isSupported()) {
      // Our own SegmentManager/CacheManager/DownloadManager/PrefetchManager stack owns the
      // real sliding cache window (PREFETCH_BEFORE/AFTER_SECONDS); hls.js's fLoader is swapped for one backed by that
      // cache, so hls.js's own fragment requests transparently become cache hits once
      // PrefetchManager has already downloaded them.
      const prefetchSystem = createPrefetchSystem(
        { beforeSeconds: PREFETCH_BEFORE_SECONDS, afterSeconds: PREFETCH_AFTER_SECONDS },
        { maxConcurrentDownloads: 3, maxCacheEntries: 60 },
      );
      // The 403/410 recovery below sets resumePositionRef (the second
      // playback had reached); otherwise a "Resume" link's saved second
      // (H-27); -1 is hls.js's own "from the start".
      const isLinkRecovery = resumePositionRef.current !== null;
      const startPosition = resumePositionRef.current ?? requestedStartRef.current ?? -1;
      resumePositionRef.current = null;
      requestedStartRef.current = null;
      // One fresh-link attempt per player instance (see the ERROR handler).
      let linkRecoveryTried = false;
      const hls = new Hls({
        fLoader: prefetchSystem.loaderClass,
        // Without a cap, hls.js's own congestion-avoidance logic will happily buffer minutes
        // ahead on a fast connection — keep its ambition aligned with our actual cache window
        // instead of racing ahead of what PrefetchManager is managing.
        maxBufferLength: PREFETCH_AFTER_SECONDS,
        maxMaxBufferLength: PREFETCH_AFTER_SECONDS,
        backBufferLength: PREFETCH_BEFORE_SECONDS,
        startPosition,
        abrEwmaDefaultEstimate: START_BANDWIDTH_ESTIMATE_BPS,
        // Never pull a rendition bigger than the <video> is actually drawn (a phone
        // browser, the framed layout). hls.js re-checks on resize and fullscreen, and a
        // quality picked by hand in the menu still overrides it.
        capLevelToPlayerSize: true,
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
        // A rebuild after link recovery: the viewer was mid-sitting, so pick
        // up playing rather than sitting paused at the remembered second.
        // (No autoplay on first load — a resumed title waits at its saved
        // second for the click, like any other.)
        if (isLinkRecovery) void video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.FRAG_LOADED, () => {
        loadedFragmentCountRef.current += 1;
      });
      // The subtitle renditions are declared by the master playlist, so they
      // only exist once it has parsed — and hls.js re-emits this whenever the
      // active variant's subtitle group changes.
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_event, data) => {
        setSubtitleTracks(data.subtitleTracks.map((track, index) => ({ index, name: track.name })));
        setSubtitleTrack(hls.subtitleTrack);
      });
      // hls.js honours DEFAULT=YES on its own, so the menu follows its choice
      // rather than assuming Off and silently disagreeing with what's on screen.
      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_event, data) => setSubtitleTrack(data.id));
      // Cues still load and fire `cuechange`; the browser just paints nothing,
      // leaving SubtitleOverlay to render them as HTML it can actually wrap,
      // size and position.
      hls.subtitleDisplay = false;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: {
              // 403/410 come from the cache server's token check: the signed
              // link is rejected or has expired. Re-requesting the same URL
              // (what startLoad() does — and hls.js itself never retries a
              // 4xx, so it fails again at once) can never succeed. Ask the
              // API for a fresh link ONCE per player instance; when it
              // differs, the effect keyed on playlistUrl rebuilds the player
              // from the remembered position. The same link coming back (a
              // 403 that is not an expiry) or the refetch failing (lapsed
              // subscription, API down) is terminal: stop and show the error.
              // Looping startLoad() here would hammer cache AND API in a
              // tight cycle for as long as the tab stays open.
              const status = data.response?.code;
              if (status === 403 || status === 410) {
                if (linkRecoveryTried) {
                  hls.destroy();
                  setPlaybackFailed(true);
                  break;
                }
                linkRecoveryTried = true;
                resumePositionRef.current = video.currentTime;
                void queryClient.invalidateQueries({ queryKey: ["stream", movieId] }).then(() => {
                  // A fresh link already rebuilt the player — nothing to do.
                  if (hlsRef.current !== hls) return;
                  const fresh = queryClient.getQueryData<{ playlistUrl: string }>(["stream", movieId]);
                  // A different link is on its way through the effect.
                  if (fresh?.playlistUrl && fresh.playlistUrl !== playlistUrl) return;
                  resumePositionRef.current = null;
                  hls.destroy();
                  setPlaybackFailed(true);
                });
                break;
              }
              hls.startLoad();
              break;
            }
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
      // H-27 on Safari's native engine: there is no startPosition to hand
      // over, so seek once the duration is known.
      const startAt = requestedStartRef.current;
      requestedStartRef.current = null;
      const seekToStart = () => {
        if (startAt !== null && startAt < video.duration) video.currentTime = startAt;
      };
      if (startAt !== null) video.addEventListener("loadedmetadata", seekToStart, { once: true });
      video.src = playlistUrl;

      // No hls.js instance to ask on this path — the same manifest renditions
      // arrive as TextTracks on the element, and Safari may enable the
      // DEFAULT=YES one itself, so the menu mirrors the live track modes
      // instead of holding its own idea of what is showing.
      const textTracks = video.textTracks;
      const syncTextTracks = () => {
        const tracks = subtitleTextTracks(textTracks);
        setSubtitleTracks(tracks.map((track, index) => ({ index, name: track.label || track.language })));
        // findIndex returns -1 when nothing is showing — the same sentinel.
        setSubtitleTrack(tracks.findIndex((track) => track.mode === "showing"));
      };
      syncTextTracks();
      textTracks.addEventListener("addtrack", syncTextTracks);
      textTracks.addEventListener("removetrack", syncTextTracks);
      textTracks.addEventListener("change", syncTextTracks);

      return () => {
        video.removeEventListener("loadedmetadata", seekToStart);
        textTracks.removeEventListener("addtrack", syncTextTracks);
        textTracks.removeEventListener("removetrack", syncTextTracks);
        textTracks.removeEventListener("change", syncTextTracks);
      };
    }
  }, [streamInfo?.playlistUrl, movieId, queryClient]);

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
  // State is only replaced when something actually changed — a fresh array/object
  // every tick would re-render the whole page twice a second for nothing. While
  // paused the poll slows to every 2 s (downloads the prefetcher finishes during
  // a pause fire no <video> event), and the element's own `progress` and `seeked`
  // events refresh it straight away.
  useEffect(() => {
    if (!hasStarted) return;
    const video = videoRef.current;
    const readStatus = () => {
      if (video) {
        const ranges: [number, number][] = [];
        for (let i = 0; i < video.buffered.length; i++) {
          ranges.push([video.buffered.start(i), video.buffered.end(i)]);
        }
        setBufferedRanges((previous) => (sameRanges(previous, ranges) ? previous : ranges));
      }
      const status = prefetchRef.current?.getStatus() ?? null;
      setPrefetchStatus((previous) => (samePrefetchStatus(previous, status) ? previous : status));
    };
    readStatus();
    const interval = setInterval(readStatus, isPlaying ? STATUS_POLL_MS : PAUSED_STATUS_POLL_MS);
    if (isPlaying || !video) return () => clearInterval(interval);
    video.addEventListener("progress", readStatus);
    video.addEventListener("seeked", readStatus);
    return () => {
      clearInterval(interval);
      video.removeEventListener("progress", readStatus);
      video.removeEventListener("seeked", readStatus);
    };
  }, [hasStarted, isPlaying, streamInfo?.playlistUrl]);

  /**
   * Last position written for which title — lets the page-hide save skip a
   * write the pause save already made (closing a paused tab would otherwise
   * send the same second twice).
   */
  const lastSavedPositionRef = useRef<{ movieId: string; seconds: number } | null>(null);

  /**
   * Saves the watch position. `force` skips the 8-second throttle; `onExit`
   * sends it with fetch keepalive so it survives the tab closing, and skips it
   * when that exact second was already saved.
   */
  const saveProgress = useCallback(
    (force = false, onExit = false) => {
      // PATCH /videos/:id/watch-progress is 401 for a guest — and there is
      // no history to write to anyway. Nothing is recorded until playback
      // has actually started on this visit: opening a title and leaving
      // again must never overwrite its saved position (H-27).
      if (!isAuthenticated || !movie || durationSeconds === 0 || !hasStarted) return;
      const now = Date.now();
      if (!force && now - lastSavedAt.current < PROGRESS_SAVE_INTERVAL_MS) return;
      const time = currentTimeRef.current;
      const seconds = Math.round(time);
      const last = lastSavedPositionRef.current;
      if (onExit && last && last.movieId === movie.id && last.seconds === seconds) return;
      lastSavedAt.current = now;
      lastSavedPositionRef.current = { movieId: movie.id, seconds };
      const percent = Math.min(100, Math.round((time / durationSeconds) * 100));
      if (onExit) {
        historyService.sendProgressOnExit(movie.id, percent, seconds);
        return;
      }
      historyService.updateProgress(movie.id, percent, seconds).catch(() => {});
    },
    [isAuthenticated, movie, durationSeconds, hasStarted],
  );

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => saveProgress(), PROGRESS_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);

  // The unmount save runs once, so it reads the LATEST saver through a ref —
  // the mount-time closure still has durationSeconds at 0 and would no-op.
  const saveProgressRef = useRef(saveProgress);
  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);
  useEffect(() => {
    return () => saveProgressRef.current(true);
  }, []);

  // Closing the tab, switching away from it or locking the phone never unmounts
  // React, so the unmount save above never runs then. `pagehide` and
  // `visibilitychange` → hidden are the last moments the page is sure to get;
  // the save goes out with fetch keepalive so the browser finishes it even
  // after the page is gone.
  useEffect(() => {
    const saveOnExit = () => saveProgressRef.current(true, true);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") saveOnExit();
    };
    window.addEventListener("pagehide", saveOnExit);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", saveOnExit);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const goToEpisode = useCallback(
    (episodeId: string) => {
      router.push(`/player/${episodeId}`);
    },
    [router],
  );

  // Stable, so the memoised EpisodeRail is not re-rendered by every clock tick.
  const closeRail = useCallback(() => setIsRailOpen(false), []);

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
      // nextLevel switches without a stall: the piece playing now and the next
      // buffered piece are kept, so playback never stops. hls.js still drops the
      // video buffered after those two and downloads it again at the new quality
      // (up to ~24 s with the 30 s look-ahead). currentLevel stalled and dropped
      // everything ahead, including the piece playing. -1 is Auto, as before.
      hlsRef.current.nextLevel = level.index;
      setQuality(label);
    }
  };

  const handleSubtitleTrackChange = useCallback((trackId: number) => {
    const hls = hlsRef.current;
    if (hls) {
      // hls.js parses the rendition and renders its cues itself; -1 is Off.
      hls.subtitleTrack = trackId;
    } else if (videoRef.current) {
      // Native path: showing is a per-track mode, so exactly one goes on and
      // every other one goes off. Off simply leaves none of them showing.
      subtitleTextTracks(videoRef.current.textTracks).forEach((track, index) => {
        track.mode = index === trackId ? "showing" : "disabled";
      });
    }
    setSubtitleTrack(trackId);
  }, []);

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
  usePlayerHotkeys(canWatch && Boolean(streamInfo), {
    onTogglePlay: () => {
      const willPlay = videoRef.current?.paused ?? false;
      togglePlay();
      showHud(willPlay ? PlayGlyph : PauseGlyph);
      resetHideTimer();
    },
    onSeekBy: (delta) => {
      handleSkip(delta);
      showHud(delta > 0 ? ForwardIcon : ReplayIcon, p.seekHud(delta));
      resetHideTimer();
    },
    onSeekToFraction: (fraction) => {
      if (durationSeconds <= 0) return;
      const target = fraction * durationSeconds;
      applySeek(target);
      showHud(ForwardIcon, formatTimecode(target));
      resetHideTimer();
    },
    onVolumeBy: (delta) => {
      const next = Math.min(100, Math.max(0, volume + delta));
      setVolume(next);
      if (next > 0 && isMuted) setIsMuted(false);
      showHud(next === 0 ? MutedIcon : next < 50 ? VolumeLowIcon : VolumeIcon, p.volumePercent(next), next);
      resetHideTimer();
    },
    onToggleMute: () => {
      const next = !isMuted;
      setIsMuted(next);
      showHud(next ? MutedIcon : volume < 50 ? VolumeLowIcon : VolumeIcon, next ? p.muted : p.volumePercent(volume));
      resetHideTimer();
    },
    onToggleFullscreen: toggleFullscreen,
    onToggleTheater: () => setIsTheater((theater) => !theater),
    onNextEpisode: nextEpisode ? () => goToEpisode(nextEpisode.id) : undefined,
  });

  if (isLoading) return <PageLoader />;

  if (!movie) {
    return (
      <section
        aria-labelledby="player-not-found"
        className="flex min-h-[clamp(560px,62.5vw,100vh)] flex-col items-center justify-center bg-ground px-gutter text-center"
      >
        <span className="flex size-[72px] items-center justify-center rounded-full bg-tonal-faint text-fg-muted">
          <NoVideoIcon size={30} />
        </span>
        <h1
          id="player-not-found"
          className="mt-5 text-[28px] leading-[34px] font-black tracking-[-0.03em] text-fg [&:lang(my)]:tracking-normal"
        >
          {t.player.state.notFound}
        </h1>
        <p className="mt-2 max-w-[400px] text-[15px] leading-[23px] text-fg-muted">{p.notFoundBody}</p>
        <Link href="/" className={cn(buttonVariants({ variant: "play", size: "cta" }), "mt-6")}>
          {t.player.state.backHome}
        </Link>
      </section>
    );
  }

  const notReadyYet = streamError instanceof ApiError && streamError.status === 404;
  const backHref = movie.seriesId ? `/series/${movie.seriesId}` : `/movie/${movie.id}`;
  const inWatchlist = isInWatchlist(movie.id);
  const hasEpisodeNumbers = movie.seriesId && movie.seasonNumber != null && movie.episodeNumber != null;
  const showRail = Boolean(movie.seriesId);
  const railOpen = showRail && isRailOpen;
  // null when the runtime was never measured — the runtime is dropped rather than reading "0m".
  const runtime = formatDuration(movie.duration);
  // The bar has to survive a drag and an open menu, and there's no reason to hide
  // it from a paused picture — nobody is watching anything at that moment.
  const showControls = controlsVisible || !isPlaying || isScrubbing || isMenuOpen;
  // Labelled here rather than where the tracks are read, so the menu follows a
  // language switch without the playback engine being rebuilt for it.
  const subtitleOptions: SubtitleTrackOption[] = subtitleTracks.map((track) => ({
    id: track.index,
    label: track.name || t.player.controls.subtitleTrackFallback(track.index + 1),
  }));

  /** The stream is in hand and nothing has failed — the HUD is live. */
  const playable = canWatch && !isStreamLoading && !notReadyYet && !streamError && !playbackFailed;
  /** Which full-picture message (if any) replaces the HUD — same order as ever. */
  const wall: "processing" | "error" | "guest" | "locked" | null = canWatch
    ? isStreamLoading
      ? null
      : notReadyYet
        ? "processing"
        : streamError || playbackFailed
          ? "error"
          : null
    : isAuthLoading
      ? null
      : isGuest
        ? "guest"
        : "locked";
  // A returning member's profile (or the stream link) is still on its way.
  const showSpinner = canWatch ? isStreamLoading : isAuthLoading;
  // In theater mode the panel floats over the right of the picture, so the HUD
  // makes room for it (desktop only — on phones the panel sits under the video,
  // and fullscreen shows the video element alone).
  const panelFloats = isTheater && railOpen && !isFullscreen;

  const topTitle = movie.seriesId && parentSeries ? parentSeries.title : movie.title;
  const topSub = movie.seriesId
    ? parentSeries
      ? movie.title
      : null
    : [movie.releaseYear, movie.genre].filter(Boolean).join(" · ");

  const wallCopy =
    wall === "locked"
      ? {
          title: t.player.state.lockedTitle,
          body: movie.seriesId ? t.player.state.lockedEpisodeBody : t.player.state.lockedMovieBody(movie.title),
        }
      : wall === "guest"
        ? { title: t.player.state.signInTitle, body: t.player.state.signInBody }
        : wall === "processing"
          ? { title: t.player.state.processingTitle, body: t.player.state.processingBody }
          : wall === "error"
            ? {
                title: t.player.state.playbackError,
                body: streamError instanceof ApiError ? streamError.message : p.playbackErrorBody,
              }
            : null;

  const kbd = "h-[22px] rounded-badge bg-raised px-[7px] font-sans text-[12px] leading-[22px] font-bold text-fg-body";

  return (
    <div className="relative flex flex-col pb-24 text-fg">
      <AmbientBackdrop videoRef={videoRef} posterUrl={movie.coverUrl ?? null} seed={movie.title} active={hasStarted} />

      <section
        aria-label={movie.title}
        className={cn(
          "relative",
          isTheater
            ? "desk:h-[clamp(560px,62.5vw,100vh)] desk:overflow-hidden desk:bg-black"
            : cn(
                "desk:grid desk:items-stretch desk:gap-6 desk:px-gutter desk:pt-6",
                railOpen ? "desk:grid-cols-[minmax(0,1fr)_clamp(300px,26vw,380px)]" : "desk:grid-cols-1",
              ),
        )}
      >
        <div
          ref={containerRef}
          onMouseMove={resetHideTimer}
          className={cn(
            "relative overflow-hidden bg-black max-desk:aspect-video",
            isTheater ? "desk:absolute desk:inset-0" : "desk:aspect-video desk:rounded-dialog",
            "[&:fullscreen]:rounded-none",
            // A cursor hovering over a playing film is just clutter.
            !showControls && isPlaying && "cursor-none",
          )}
        >
          {!hasStarted && (
            <Artwork
              src={movie.coverUrl}
              seed={movie.title}
              variant="hero"
              priority
              sizes="100vw"
              zoomOnHover={false}
              className="opacity-45"
            />
          )}

          <video
            ref={videoRef}
            className={cn(
              "absolute inset-0 size-full object-contain transition-opacity duration-500",
              hasStarted ? "opacity-100" : "opacity-0",
              canWatch && "cursor-pointer",
            )}
            playsInline
            // The cache server answers every stream URL with
            // `Access-Control-Allow-Origin: *`, so this costs nothing on
            // either path (hls.js feeds a same-origin MSE blob regardless)
            // and is the precondition for a `<track>` element ever being
            // side-loaded here — and for AmbientBackdrop's canvas to stop
            // being tainted by Safari's native, cross-origin source.
            crossOrigin="anonymous"
            onClick={canWatch ? handleVideoClick : undefined}
            onDoubleClick={canWatch ? handleVideoDoubleClick : undefined}
            onPlay={() => {
              setIsPlaying(true);
              setHasStarted(true);
              setUpNextSeconds(null);
            }}
            onPause={(e) => {
              setIsPlaying(false);
              // The end of the title fires `pause` right before `ended`, which
              // saves on its own — no need to write the same second twice.
              if (!e.currentTarget.ended) saveProgress(true);
            }}
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

          {/* Scrims: a light veil plus top and bottom fades, only while the HUD shows. */}
          {!wall && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out",
                showControls ? "opacity-100" : "opacity-0",
              )}
            >
              <div className="absolute inset-0 bg-[rgba(8,8,11,0.18)]" />
              <div className="absolute inset-x-0 top-0 h-[180px] bg-[linear-gradient(180deg,rgba(8,8,11,0.78)_0%,rgba(8,8,11,0)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 h-[300px] bg-[linear-gradient(180deg,rgba(8,8,11,0)_0%,rgba(8,8,11,0.9)_100%)]" />
            </div>
          )}
          {wall && (
            <div
              aria-hidden
              className={cn("absolute inset-0 bg-art-badge backdrop-blur-[10px]", styles.fade)}
            />
          )}
          {/* Clicks pass straight through to the video, so click-to-pause and
              double-click-for-fullscreen keep working while it loads. */}
          {playable && isBuffering && <div aria-hidden className="pointer-events-none absolute inset-0 bg-glass" />}

          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 left-0 z-10",
              panelFloats && "desk:right-[calc(clamp(300px,26vw,380px)+32px)]",
            )}
          >
            <SubtitleOverlay lines={subtitleLines} style={subtitleStyle} liftForControls={showControls} />

            {/* Top row: back, title, connection, speed & quality. */}
            <div
              className={cn(
                "absolute inset-x-[clamp(16px,2.5vw,32px)] top-5 flex items-center gap-3.5 transition-opacity duration-300 ease-out",
                showControls ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <Link
                href={backHref}
                onClick={() => {
                  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
                }}
                aria-label={t.common.back}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-glass text-fg outline-none backdrop-blur-[14px] transition-[background-color,transform] duration-150 hover:bg-white/14 active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
              >
                <BackChevronIcon size={22} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-xl leading-[26px] font-extrabold tracking-[-0.01em] text-fg [&:lang(my)]:tracking-normal">
                  {topTitle}
                </p>
                {topSub && (
                  <p className="m-0 flex items-center gap-2 overflow-hidden text-sm leading-5 font-semibold whitespace-nowrap text-fg-body">
                    {hasEpisodeNumbers && (
                      <span className="h-5 shrink-0 rounded-tag bg-tonal px-1.5 text-[12px] leading-5 font-extrabold tabular-nums">
                        {p.episodeTag(movie.seasonNumber!, movie.episodeNumber!)}
                      </span>
                    )}
                    <span className="truncate">{topSub}</span>
                  </p>
                )}
              </div>
              {/* Hidden from screen readers while the row is faded out — the
                  standalone copy below speaks for it then. */}
              {hasStarted && <NetworkStatusIcon quality={networkQuality} silent={!showControls} />}
              {playable && (
                <SpeedQualityMenu
                  speed={speed}
                  onSpeedChange={setSpeed}
                  qualityOptions={qualityLevels.map((l) => l.label)}
                  quality={quality}
                  onQualityChange={handleQualityChange}
                  fullscreenContainerRef={containerRef}
                  onOpenChange={setIsSpeedMenuOpen}
                />
              )}
            </div>

            {/* With the HUD faded, the connection disc stays on its own. */}
            {hasStarted && !showControls && (
              <NetworkStatusIcon
                quality={networkQuality}
                className="absolute top-6 right-[clamp(16px,2.5vw,32px)]"
              />
            )}

            {playable && !isBuffering && (
              <div
                className={cn(
                  "absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-14 transition-opacity duration-300 ease-out max-desk:gap-7",
                  showControls ? "opacity-100" : "opacity-0",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleSkip(-10);
                    resetHideTimer();
                  }}
                  aria-label={t.player.controls.skipBack(10)}
                  className={cn(
                    "flex size-16 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-fg outline-none transition-[background-color,transform] duration-150 hover:bg-white/14 active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link max-desk:size-12",
                    showControls ? "pointer-events-auto" : "pointer-events-none",
                  )}
                >
                  <ReplayIcon withNumber size={40} strokeWidth={1.6} className="max-desk:size-8" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    togglePlay();
                    resetHideTimer();
                  }}
                  aria-label={isPlaying ? t.player.controls.pause : t.player.meta.play}
                  className={cn(
                    buttonVariants({ variant: "play" }),
                    "size-20 rounded-full p-0 shadow-[0_14px_36px_rgba(0,0,0,0.55)] max-desk:size-[60px]",
                    showControls ? "pointer-events-auto" : "pointer-events-none",
                  )}
                >
                  {isPlaying ? (
                    <PauseGlyph size={32} className="max-desk:size-6" />
                  ) : (
                    <PlayGlyph size={34} className="ml-1 max-desk:size-[26px]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSkip(10);
                    resetHideTimer();
                  }}
                  aria-label={t.player.controls.skipForward(10)}
                  className={cn(
                    "flex size-16 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-fg outline-none transition-[background-color,transform] duration-150 hover:bg-white/14 active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link max-desk:size-12",
                    showControls ? "pointer-events-auto" : "pointer-events-none",
                  )}
                >
                  <ForwardIcon withNumber size={40} strokeWidth={1.6} className="max-desk:size-8" />
                </button>
              </div>
            )}

            {playable && (
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 transition-opacity duration-300 ease-out",
                  showControls ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
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
                  subtitleTracks={subtitleOptions}
                  subtitleStyle={subtitleStyle}
                  onSubtitleStyleChange={updateSubtitleStyle}
                  subtitleTrack={subtitleTrack}
                  onSubtitleTrackChange={handleSubtitleTrackChange}
                  fullscreenContainerRef={containerRef}
                  onNextEpisode={nextEpisode ? () => goToEpisode(nextEpisode.id) : undefined}
                  onToggleEpisodes={showRail ? () => setIsRailOpen((open) => !open) : undefined}
                  episodesOpen={railOpen}
                  onMenuOpenChange={setIsControlsMenuOpen}
                />
              </div>
            )}

            {playable && upNextSeconds !== null && nextEpisode && (
              <UpNextOverlay
                episode={nextEpisode}
                secondsRemaining={upNextSeconds}
                totalSeconds={UP_NEXT_COUNTDOWN_SECONDS}
                onPlayNow={() => goToEpisode(nextEpisode.id)}
                onCancel={() => setUpNextSeconds(null)}
              />
            )}

            <PlayerHud message={hud} />

            {playable && isBuffering && (
              <div role="status" className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-11 items-center gap-2.5 rounded-full bg-art-badge px-[18px] text-sm font-bold text-fg backdrop-blur-[14px]">
                  <span aria-hidden className="flex gap-[5px]">
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </span>
                  {p.buffering}
                </span>
              </div>
            )}

            {showSpinner && (
              // Blocks the picture while there is nothing to play yet, as before.
              <div role="status" className="pointer-events-auto absolute inset-0 flex items-center justify-center">
                <svg aria-hidden width="44" height="44" viewBox="0 0 44 44" className="animate-spin">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
                  <path d="M22 4a18 18 0 0 1 18 18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <span className="sr-only">{p.loadingVideo}</span>
              </div>
            )}

            {wall && wallCopy && (
              <div
                role="status"
                className={cn(
                  "pointer-events-auto absolute inset-0 flex flex-col items-center justify-center px-6 text-center",
                  styles.fade,
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-16 items-center justify-center rounded-full",
                    wall === "locked"
                      ? "bg-gold/16 text-gold"
                      : wall === "error"
                        ? "bg-danger/14 text-danger"
                        : "bg-tonal-soft text-fg",
                  )}
                >
                  {wall === "locked" ? (
                    <LockIcon size={28} />
                  ) : wall === "guest" ? (
                    <SignInIcon size={28} />
                  ) : wall === "processing" ? (
                    <HourglassIcon size={28} />
                  ) : (
                    <WarningIcon size={28} />
                  )}
                </span>
                <h2 className="mt-[18px] text-2xl leading-[30px] font-black tracking-[-0.02em] text-fg [&:lang(my)]:tracking-normal">
                  {wallCopy.title}
                </h2>
                <p className="mt-2 max-w-[420px] text-[15px] leading-[23px] text-fg-body">{wallCopy.body}</p>
                {wall === "locked" && (
                  <Button variant="gold" size="cta" className="mt-[22px]" onClick={() => setSubscribeOpen(true)}>
                    <CrownIcon size={16} />
                    {t.player.state.subscribe}
                  </Button>
                )}
                {wall === "guest" && (
                  <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
                    <Link
                      href={loginHref(`/player/${movieId}`)}
                      className={buttonVariants({ variant: "play", size: "cta" })}
                    >
                      {t.player.state.signIn}
                    </Link>
                    <Link href={backHref} className={buttonVariants({ variant: "tonal", size: "cta" })}>
                      {t.common.back}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {railOpen && (
          <div
            className={cn(
              "relative max-desk:m-4 max-desk:h-[520px]",
              isTheater
                ? "desk:absolute desk:top-4 desk:right-4 desk:bottom-4 desk:z-30 desk:w-[clamp(300px,26vw,380px)]"
                : "desk:min-h-[360px]",
            )}
          >
            <EpisodeRail
              seriesId={movie.seriesId!}
              currentEpisodeId={movie.id}
              variant={isTheater ? "floating" : "framed"}
              // Closing needs a way back — the Episodes button on the control
              // row — so the close button only shows while the HUD is live.
              onClose={playable ? closeRail : undefined}
            />
          </div>
        )}
      </section>

      <section
        aria-labelledby="player-info-title"
        className="grid grid-cols-1 items-start gap-x-10 gap-y-5 px-gutter pt-10 desk:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div className="max-w-[860px] min-w-0">
          {movie.seriesId && parentSeries ? (
            <Link
              href={`/series/${movie.seriesId}`}
              className="mq-link rounded-[4px] text-[12px] leading-4 font-extrabold tracking-[0.14em] uppercase outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link [&:lang(my)]:tracking-normal"
            >
              {parentSeries.title}
            </Link>
          ) : (
            <span className="text-[12px] leading-4 font-extrabold tracking-[0.14em] text-link uppercase [&:lang(my)]:tracking-normal">
              {t.nav.movies}
            </span>
          )}
          <h1
            id="player-info-title"
            className="mt-1.5 text-[clamp(32px,3vw,44px)] leading-[1.08] font-black tracking-[-0.03em] text-fg [&:lang(my)]:leading-[1.3] [&:lang(my)]:tracking-normal"
          >
            {movie.title}
          </h1>
          {hasEpisodeNumbers && (
            <p className="mt-1.5 text-[15px] leading-[22px] text-fg-muted tabular-nums">
              {t.player.meta.seasonEpisode(movie.seasonNumber!, movie.episodeNumber!)}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] leading-[22px] text-fg-body tabular-nums">
            {accessType && <AccessBadge accessType={accessType} />}
            {movie.rating > 0 && <Rating value={movie.rating} size="lg" />}
            <span aria-hidden className="text-fg-decor">
              ·
            </span>
            <span>{movie.releaseYear}</span>
            {runtime && (
              <>
                <span aria-hidden className="text-fg-decor">
                  ·
                </span>
                <span>{runtime}</span>
              </>
            )}
            <span aria-hidden className="text-fg-decor">
              ·
            </span>
            <span>{movie.genre}</span>
            {movie.categories.map((category) => (
              <span key={category.id} className="contents">
                <span aria-hidden className="text-fg-decor">
                  ·
                </span>
                <span>{category.name}</span>
              </span>
            ))}
          </div>

          <p className="mt-4 max-w-[68ch] text-body text-fg-body">{movie.description}</p>

          <p
            className="mt-[18px] flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[13px] leading-[18px] text-fg-faint max-desk:hidden"
          >
            <span className="inline-flex items-center gap-1.5">
              <kbd className={kbd}>Space</kbd>
              {p.keyPlayPause}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className={kbd}>← →</kbd>
              {p.keySeek}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className={kbd}>F</kbd>
              {p.keyFullscreen}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className={kbd}>T</kbd>
              {p.keyTheater}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 desk:pt-[22px]">
          <Button
            variant="tonal"
            size="cta"
            onClick={() => toggleWatchlist(movie.id)}
            aria-pressed={inWatchlist}
          >
            {inWatchlist ? <CheckIcon size={20} strokeWidth={2} className="text-money" /> : <PlusIcon size={20} />}
            {inWatchlist ? p.inMyList : p.myList}
          </Button>
          <Button
            variant="tonal"
            size="cta"
            onClick={() => setShareOpen(true)}
            aria-label={t.player.meta.share}
            aria-haspopup="dialog"
            className="w-12 px-0"
          >
            <ShareIcon size={20} />
          </Button>
        </div>
      </section>

      <SimilarTitlesRow movies={similarMovies} isLoading={isSimilarLoading} />

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
