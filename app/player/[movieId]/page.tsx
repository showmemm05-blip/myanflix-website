"use client";

import { memo, use, useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
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
import { AdOverlay } from "@/components/player/AdOverlay";
import { BreakAdLayer, type BreakSession } from "@/components/player/BreakAdLayer";
import { CornerAd } from "@/components/player/CornerAd";
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
import { adService, type AdEventName, type AdSession, type VideoAd } from "@/services/api/adService";
import { ApiError } from "@/services/api/apiClient";
import { createPrefetchSystem, type PrefetchHandle } from "@/lib/streaming/PrefetchController";
import { createRecoveryBudget, decideNativeError, requestFreshLink, type PlaybackFailure } from "@/lib/streaming/linkRecovery";
import { qualityLabel } from "@/lib/streaming/qualityLabel";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useNetworkQuality } from "@/lib/hooks/use-network-quality";
import { usePlayerHotkeys } from "@/lib/hooks/use-player-hotkeys";
import { formatDuration, formatTimecode } from "@/lib/format";
import { localizedDescription } from "@/lib/localized-description";
import { parseStartSeconds, START_PARAM, usableStartSeconds } from "@/lib/player/resume";
import {
  PREROLL_STALL_MS,
  adEventPosition,
  adSecondsLeft,
  claimAdEvent,
  createAdEventLedger,
  prerollStage,
  skipState,
  type AdEventLedger,
  type AdFinishReason,
  type AdPhase,
  type AdPlaybackEvent,
} from "@/lib/player/preroll";
import {
  MIDROLL_DECISION_BACKSTOP_MS,
  MIDROLL_OFF,
  createMidrollState,
  midrollDecisionUsable,
  midrollMarkers,
  midrollNoteSeek,
  midrollRebase,
  midrollStart,
  midrollTick,
  type MidrollAction,
  type MidrollState,
} from "@/lib/player/midroll";
import {
  CORNER_OFF,
  cornerDismiss,
  cornerFail,
  cornerNearEnd,
  cornerTick,
  createCornerState,
  type CornerState,
} from "@/lib/player/corner";
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

function sameSeconds(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((seconds, index) => seconds === b[index]);
}

/** The seek bar's "no breaks" — one shared array, so a page with none never hands the bar a new one. */
const NO_BREAK_MARKERS: readonly number[] = Object.freeze([]);
/** The subtitles while a break holds the picture — one shared array, as above. */
const NO_SUBTITLE_LINES: string[] = [];

/** A break that fired (lib/player/midroll.ts): ONE ad for every break in `consumed`. */
type BreakAction = Extract<MidrollAction, { kind: "break" }>;

/**
 * The break in progress, kept where the movie's own handlers can read it
 * without a render: its token (a stale answer or timer is ignored), whether
 * its ad has arrived, the 8 s backstop on the decision and the request to
 * cancel if the page moves on.
 */
interface RunningBreak {
  token: number;
  hasAd: boolean;
  backstop: ReturnType<typeof setTimeout> | null;
  abort: AbortController | null;
}

/**
 * The decision asked ahead of a break (`prefetch`): reused only when that
 * very break is the last one crossed and it is under 8 minutes old
 * (midrollDecisionUsable); otherwise it is aborted and never played.
 */
interface BreakDecision {
  breakIndex: number;
  askedAt: number;
  promise: Promise<VideoAd | null>;
  abort: AbortController;
}

/**
 * What the corner picture has reported this viewing: the last showing that
 * went out (`started` for the first, `shown` after), and whether it is over
 * (closed or failed) so nothing more is sent — plus whether this showing's
 * picture has loaded, before which its time on screen does not count.
 */
interface CornerLedger {
  playbackId: string;
  reportedShowing: number;
  final: boolean;
  /** Set when CornerAd is visible with its picture loaded; cleared when a showing starts or ends. */
  pictureReady: boolean;
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
  const { t, language } = useLanguage();
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
   * This viewing's advertising (`POST /ads/session`): the pre-roll
   * (lib/player/preroll.ts), the break plan (lib/player/midroll.ts) and the
   * corner picture (lib/player/corner.ts). Asked for in parallel with the
   * stream link — never folded into it, since the 403/410 link recovery
   * refetches that query and must not re-decide. A slow or failed answer is
   * simply "no ads": the title never waits on advertising. Every open asks:
   * once an ad has STARTED for this viewer and title, the backend itself
   * answers "no ad" for that title until the admin's "Same movie again"
   * minutes have passed — a refresh mid-ad included — so a setting the
   * admin changes holds at once. The break plan and the corner are kept for
   * the whole viewing; an admin change applies from the next open.
   */
  const {
    data: adSession,
    isSuccess: isAdSessionDecided,
    isError: isAdSessionFailed,
  } = useQuery({
    queryKey: ["ad-session", movieId],
    queryFn: ({ signal }) => adService.getSession(movieId, { signal }),
    enabled: canWatch,
    retry: false,
    // One decision per visit: a refetch mid-ad would swap the impression
    // under it, and the backend reuses an open decision for 10 min anyway.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnReconnect: false,
  });
  const prerollAd = adSession?.preroll ?? null;
  const prerollDecided = isAdSessionDecided || isAdSessionFailed;
  const cornerAd = adSession?.corner ?? null;
  /** The second `<video>` for breaks exists only when this viewing has any. */
  const hasBreaks = Boolean(adSession?.breaks);
  /**
   * Read by the player effect when it builds (the break plan and the corner
   * start at the real start position). Mirrored by an effect declared BEFORE
   * that one, so in the commit where both run the session is already here.
   */
  const adSessionRef = useRef<AdSession | null>(null);
  useEffect(() => {
    adSessionRef.current = adSession ?? null;
  }, [adSession]);
  /** Keyed on the title, so an episode swap starts the next title's ad from scratch. */
  const [adPhaseFor, setAdPhaseFor] = useState<{ movieId: string; phase: AdPhase }>({ movieId, phase: "idle" });
  const adPhase = adPhaseFor.movieId === movieId ? adPhaseFor.phase : "idle";
  const adStage = prerollStage({ decided: prerollDecided, ad: prerollAd, phase: adPhase });
  const adPlaying = adStage === "playing";
  /**
   * Every <video> handler below branches on this first: while true the
   * element carries the ad, and nothing the title keeps (progress, position,
   * duration, up next, link recovery) may see what it reports.
   */
  const isAdActiveRef = useRef(false);
  /** Set when the ad leaves the element: the title's player, built next, plays at once. */
  const autoplayAfterAdRef = useRef(false);
  /** Which events have gone for the current play — one each, however often the element repeats itself. */
  const adEventsRef = useRef<AdEventLedger | null>(null);
  const [adTime, setAdTime] = useState(0);
  const [adMediaDuration, setAdMediaDuration] = useState(0);
  const [adPaused, setAdPaused] = useState(false);
  /**
   * The title the ad just handed the element to (finishAd), until that
   * title's own first `play` event: the element stays in view, the poster
   * and the centre Play stay away, and the buffering pill bridges the one
   * or two seconds hls.js needs to parse the manifest and append the first
   * segment. Only ever set by finishAd, so a title with no ad never sees it;
   * off again if the build fails (the poster / error overlay take over) or
   * the autoplay is refused (the Play button must come back).
   */
  const [adHandoffFor, setAdHandoffFor] = useState<string | null>(null);

  /*
   * Mid-roll breaks and the corner picture. Both schedulers are pure state
   * held in refs and stepped by the movie's `timeupdate`; React state changes
   * only when a break starts or ends, the seek-bar ticks change, or the
   * corner starts or stops a showing — never per tick. A break plays on a
   * SECOND element (BreakAdLayer) over the paused movie, so hls.js, the
   * buffer and `adStage` (whose every change rebuilds the player) are never
   * touched.
   */
  /** BreakAdLayer's `<video>`. */
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const midrollRef = useRef<MidrollState>(MIDROLL_OFF);
  const cornerRef = useRef<CornerState>(CORNER_OFF);
  const cornerLedgerRef = useRef<CornerLedger | null>(null);
  /** The break in progress; null between breaks. */
  const breakRef = useRef<RunningBreak | null>(null);
  const breakTokenRef = useRef(0);
  const breakDecisionRef = useRef<BreakDecision | null>(null);
  /** The ad element the first Play gesture unlocked (Safari wants one per element). */
  const breakUnlockedRef = useRef<HTMLVideoElement | null>(null);
  /** The movie's length as the scheduler last saw it — the seek-bar ticks are computed against it. */
  const durationRef = useRef(0);
  const [breakSession, setBreakSession] = useState<BreakSession | null>(null);
  const [breakMarkers, setBreakMarkers] = useState<readonly number[]>(NO_BREAK_MARKERS);
  /** The corner is in a showing (mounted); whether it is visible right now is decided per render. */
  const [cornerShowing, setCornerShowing] = useState(false);
  /** The tab is in front: a hidden tab never counts corner time (the movie may play on behind it). */
  const [pageVisible, setPageVisible] = useState(true);
  /** At least half the stage is on screen — watched only while a corner showing is mounted. */
  const [stageOnScreen, setStageOnScreen] = useState(true);
  const breakActive = breakSession !== null;

  /**
   * Where playback was when a signed link was found expired (410) or
   * rejected (403). The recovery fetches a fresh link, which rebuilds the
   * player; this is how the rebuild knows to pick up from the same second
   * instead of the start.
   */
  const resumePositionRef = useRef<number | null>(null);
  /**
   * Safari's native engine has no hls.js instance to keep a recovery budget
   * on, so its one fresh-link attempt per source is remembered here; reset
   * whenever the player effect loads a new URL.
   */
  const nativeLinkRefetchedRef = useRef(false);
  /**
   * The one fresh-link attempt both engines share (requestFreshLink holds
   * the rule). When a DIFFERENT link comes back the effect keyed on
   * playlistUrl rebuilds the player from resumePositionRef; false (the same
   * link again, or the refetch failed) is terminal for the caller.
   */
  const refetchStreamLink = useCallback(
    (currentUrl: string) => requestFreshLink(queryClient, ["stream", movieId], currentUrl),
    [queryClient, movieId],
  );
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
   * Why this player instance gave up (lib/streaming/linkRecovery.ts): the
   * signed link could not be renewed, the network budget ran out, the media
   * could not be recovered, or something hls.js cannot mend. Terminal for
   * this player instance — shows the playback-error overlay instead of
   * retrying; null while playback is (still) fine.
   */
  const [playbackFailure, setPlaybackFailure] = useState<PlaybackFailure | null>(null);
  /** The ad-to-title hand-off is on (see adHandoffFor) — never past a failed build. */
  const adHandoff = adHandoffFor === movieId && playbackFailure === null;
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

  /** The seek-bar ticks for the scheduler as it stands, replaced only when they differ. */
  const refreshBreakMarkers = useCallback((state: MidrollState) => {
    const next = midrollMarkers(state, durationRef.current);
    setBreakMarkers((current) => (sameSeconds(current, next) ? current : next));
  }, []);

  /**
   * Stores the scheduler's next state. The ticks only move when a break is
   * done or forgiven, the quiet gap moves, or the plan itself changes —
   * every other step (most ticks) costs no render at all.
   */
  const commitMidroll = useCallback(
    (next: MidrollState) => {
      const previous = midrollRef.current;
      if (next === previous) return;
      midrollRef.current = next;
      if (next.done !== previous.done || next.quietUntil !== previous.quietUntil || next.interval !== previous.interval) {
        refreshBreakMarkers(next);
      }
    },
    [refreshBreakMarkers],
  );

  /**
   * The open's real start — after the pre-roll, at the resume second: the
   * break plan starts here (breaks before it are forgiven, the quiet gap
   * begins) and the corner starts counting watched seconds afresh.
   */
  const startAdSchedules = useCallback(
    (startSeconds: number) => {
      const session = adSessionRef.current;
      commitMidroll(midrollStart(createMidrollState(session?.breaks), startSeconds));
      cornerRef.current = createCornerState(session?.corner);
      cornerLedgerRef.current = session?.corner
        ? { playbackId: session.corner.playbackId, reportedShowing: 0, final: false, pictureReady: false }
        : null;
    },
    [commitMidroll],
  );

  // Set up HLS.js (or native HLS on Safari) once the real playlist URL is
  // known — and once the pre-roll ad, if any, has left the element: the ad
  // plays on this same <video> first (startAd), so building the title's
  // engine any earlier would have the two fight over it.
  useEffect(() => {
    const video = videoRef.current;
    const playlistUrl = streamInfo?.playlistUrl;
    if (!video || !playlistUrl || adStage !== "done") return;

    loadedFragmentCountRef.current = 0;
    // Whatever the previous source advertised is gone the moment the URL changes.
    setSubtitleTracks([]);
    setSubtitleTrack(SUBTITLES_OFF);
    setSubtitleLines([]);
    setPlaybackFailure(null);
    nativeLinkRefetchedRef.current = false;

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
      // The viewer already pressed Play once — for the ad that just ended —
      // so the title starts by itself, exactly as after a link rebuild.
      const autoplay = isLinkRecovery || autoplayAfterAdRef.current;
      autoplayAfterAdRef.current = false;
      const startPosition = resumePositionRef.current ?? requestedStartRef.current ?? -1;
      resumePositionRef.current = null;
      requestedStartRef.current = null;
      // A rebuild picks up the same viewing where it stopped: nothing is
      // crossed, consumed or forgiven. Any other build is the open's start.
      if (isLinkRecovery) commitMidroll(midrollRebase(midrollRef.current, startPosition));
      else startAdSchedules(Math.max(0, startPosition));
      // One recovery budget per player instance (see the ERROR handler):
      // a few bounded restarts, two media recoveries, one fresh link.
      const recovery = createRecoveryBudget();
      let retryTimer: ReturnType<typeof setTimeout> | null = null;
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
            .map((level, index) => ({ label: qualityLabel(level), index }))
            .sort((a, b) => b.index - a.index),
        ];
        setQualityLevels(levels);
        prefetchRef.current = prefetchSystem.attach(hls, video);
        // A rebuild after link recovery: the viewer was mid-sitting, so pick
        // up playing rather than sitting paused at the remembered second.
        // Likewise after the ad. (No autoplay on a plain first load — a
        // resumed title waits at its saved second for the click, like any
        // other.) A refusal hands the picture back to the poster and Play.
        if (autoplay) void video.play().catch(() => setAdHandoffFor(null));
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
      // The end of this instance: a restart still pending must not fire on it.
      const failPlayback = (reason: PlaybackFailure) => {
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = null;
        hls.destroy();
        setPlaybackFailure(reason);
      };
      hls.on(Hls.Events.ERROR, (_event, data) => {
        // The decision table lives in lib/streaming/linkRecovery.ts; this
        // only carries it out. Once the budget is spent the player is torn
        // down and the error overlay shown — never a restart loop against
        // the cache (and, through the 403/410 path, the API) for as long as
        // the tab stays open.
        const decision = recovery.decide({ fatal: data.fatal, type: data.type, status: data.response?.code });
        switch (decision.action) {
          case "ignore":
            return;
          case "startLoad":
            // hls.js itself never retries a 4xx, so an immediate startLoad()
            // on a missing segment fails again at once; the pause also gives
            // a restarting cache a moment. startLoad() with no argument picks
            // up from the last position.
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              retryTimer = null;
              if (hlsRef.current === hls) hls.startLoad();
            }, decision.delayMs);
            return;
          case "recoverMediaError":
            // hls.js's own recipe: the second time round, swap the audio
            // codec before recovering.
            if (decision.swapAudioCodec) hls.swapAudioCodec();
            hls.recoverMediaError();
            return;
          case "refetchStream":
            // 403/410 come from the cache server's token check: the signed
            // link is rejected or has expired. Re-requesting the same URL
            // can never succeed; a fresh link from the API can. When it
            // differs, the effect keyed on playlistUrl rebuilds the player
            // from the remembered position. The same link coming back (a
            // 403 that is not an expiry) or the refetch failing (lapsed
            // subscription, API down) is terminal: stop and show the error.
            resumePositionRef.current = video.currentTime;
            void refetchStreamLink(playlistUrl).then((renewed) => {
              // A fresh link already rebuilt the player — nothing to do.
              if (hlsRef.current !== hls) return;
              // A different link is on its way through the effect.
              if (renewed) return;
              resumePositionRef.current = null;
              failPlayback("link");
            });
            return;
          case "fail":
            failPlayback(decision.reason);
            return;
        }
      });

      return () => {
        if (retryTimer) clearTimeout(retryTimer);
        prefetchRef.current?.destroy();
        prefetchRef.current = null;
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // H-27 on Safari's native engine: there is no startPosition to hand
      // over, so seek once the duration is known. After a fresh-link rebuild
      // (the element's onError below) the remembered second wins and
      // playback picks up on its own, as on the hls.js path.
      const isLinkRecovery = resumePositionRef.current !== null;
      // As on the hls.js path: the ad that just ended was the viewer's Play.
      const autoplay = isLinkRecovery || autoplayAfterAdRef.current;
      autoplayAfterAdRef.current = false;
      const startAt = resumePositionRef.current ?? requestedStartRef.current;
      resumePositionRef.current = null;
      requestedStartRef.current = null;
      if (isLinkRecovery) commitMidroll(midrollRebase(midrollRef.current, startAt ?? 0));
      else startAdSchedules(startAt ?? 0);
      const seekToStart = () => {
        if (startAt !== null && startAt < video.duration) {
          // The player's own seek, not the viewer's: declared, so it crosses nothing.
          commitMidroll(midrollRebase(midrollRef.current, startAt));
          video.currentTime = startAt;
        }
        if (autoplay) void video.play().catch(() => setAdHandoffFor(null));
      };
      if (startAt !== null || autoplay) video.addEventListener("loadedmetadata", seekToStart, { once: true });
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
    // commitMidroll / startAdSchedules are stable: the keys are still the link and adStage.
  }, [streamInfo?.playlistUrl, refetchStreamLink, adStage, commitMidroll, startAdSchedules]);

  // Sync volume/speed to the actual media element.
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume / 100;
  }, [volume]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);
  // The ad's own rate is pinned to 1× (startAd); the viewer's speed goes
  // back on the element the moment the title's player takes it over.
  useEffect(() => {
    if (adPlaying) return;
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, adPlaying]);

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
      setPageVisible(document.visibilityState === "visible");
      if (document.visibilityState === "hidden") saveOnExit();
    };
    window.addEventListener("pagehide", saveOnExit);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", saveOnExit);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Whether the player is at least half on screen (a viewer who scrolled
  // down to the episodes is not looking at it), kept for the whole viewing so
  // a corner showing knows it from its first frame. The observer only calls
  // back when the half-way line is crossed.
  const hasStage = !isLoading && !!movie;
  useEffect(() => {
    const stage = containerRef.current;
    if (!hasStage || !stage || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setStageOnScreen(entry ? entry.intersectionRatio >= 0.5 : true),
      { threshold: 0.5 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [hasStage]);

  /**
   * A mouse (not a finger): moving it to the corner's ✕ brings the controls
   * up, so with a mouse the corner stays through them; on a touch screen it
   * steps aside while they show, as it never has to be reached past them.
   */
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");

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

  /** One of each event per play, fire-and-forget: the backend ignores repeats and wrong orders anyway. */
  const sendAdEvent = useCallback((event: AdPlaybackEvent, positionSeconds: number) => {
    const ledger = adEventsRef.current;
    if (!ledger || !claimAdEvent(ledger, event)) return;
    adService.sendPlaybackEvent(ledger.playbackId, event, positionSeconds).catch(() => {});
  }, []);

  /**
   * Takes the ad off the element and clears every trace of it, so what the
   * title's player finds next is an element that never played anything.
   * Shared by finishAd (the normal ends) and the title-swap cleanup (which
   * sends no event and sets no autoplay).
   */
  const clearAdFromElement = useCallback((video: HTMLVideoElement) => {
    video.pause();
    video.removeAttribute("src");
    // Drops the ad's buffered data and its connection; without this the
    // element would carry on fetching the ad behind the title.
    video.load();
    isAdActiveRef.current = false;
    adEventsRef.current = null;
    setAdPaused(false);
    setAdTime(0);
    setAdMediaDuration(0);
    setIsBuffering(false);
  }, []);

  /**
   * The end of the ad, whichever way it came (completed, skipped, failed —
   * a dead link, a decode error, 10 s of stall): runs once, reports it, and
   * hands the element to the title, which then builds and plays at once.
   */
  const finishAd = useCallback(
    (reason: AdFinishReason) => {
      const video = videoRef.current;
      if (!video || !isAdActiveRef.current) return;
      sendAdEvent(reason, adEventPosition(video.currentTime));
      clearAdFromElement(video);
      // load() put the element back to its default rate; the viewer's choice stays theirs.
      video.playbackRate = speed;
      // The viewer pressed Play for the title; the ad merely went first.
      autoplayAfterAdRef.current = true;
      setAdHandoffFor(movieId);
      setAdPhaseFor({ movieId, phase: "done" });
    },
    [sendAdEvent, clearAdFromElement, speed, movieId],
  );

  /**
   * Puts the ad on the element and plays it — INSIDE the viewer's Play
   * gesture, which is what licenses this element to play with sound and, on
   * iOS, to keep playing the title afterwards without a second tap.
   */
  const startAd = useCallback(() => {
    const video = videoRef.current;
    if (!video || !prerollAd || isAdActiveRef.current) return;
    isAdActiveRef.current = true;
    adEventsRef.current = createAdEventLedger(prerollAd.playbackId);
    autoplayAfterAdRef.current = false;
    setAdTime(0);
    setAdMediaDuration(0);
    setAdPaused(false);
    // The ad loads from nothing, so the buffering pill shows until its first
    // frame — and the stall watch below counts from here.
    setIsBuffering(true);
    video.src = prerollAd.videoUrl;
    // Assigning src resets the rate to the default; an ad never runs at the viewer's 1.5× anyway.
    video.playbackRate = 1;
    // A refusal (the source already failed, or no licence after all) leaves
    // the element paused: the paused hint shows and a click tries again.
    video.play().catch(() => setAdPaused(true));
    setAdPhaseFor({ movieId, phase: "playing" });
  }, [prerollAd, movieId]);

  // An ad that cannot get going (a link the error event never reports, a
  // cache server that answers nothing) must not hold the title hostage: 10 s
  // of buffering while the ad is meant to be playing and it is given up as
  // failed. The viewer's own pause is not a stall.
  useEffect(() => {
    if (!adPlaying || !isBuffering || adPaused) return;
    const timer = setTimeout(() => finishAd("failed"), PREROLL_STALL_MS);
    return () => clearTimeout(timer);
  }, [adPlaying, isBuffering, adPaused, finishAd]);

  // A title swap mid-ad (the episode panel stays tappable): the ad comes off
  // the element with no event — the backend ages the open play out — and the
  // next title decides afresh. When the page unmounts instead, the element
  // goes with it and this is merely tidy.
  useEffect(() => {
    // The same element serves every title this page shows, so the one in
    // hand now is the one the ad will be on when the cleanup runs.
    const video = videoRef.current;
    return () => {
      if (video && isAdActiveRef.current) clearAdFromElement(video);
    };
  }, [movieId, clearAdFromElement]);

  /**
   * The end of a break, whichever way (the ad finished, no ad was due, the
   * decision never came): the movie plays on from the very frame it paused
   * on — no seek, no rebuild. A stale token (a break already ended) is ignored.
   */
  const endBreak = useCallback((token: number) => {
    const running = breakRef.current;
    if (!running || running.token !== token) return;
    if (running.backstop) clearTimeout(running.backstop);
    breakRef.current = null;
    setBreakSession(null);
    videoRef.current?.play().catch(() => {});
  }, []);

  /** BreakAdLayer's end of the ad; the event has gone already. */
  const handleBreakFinished = useCallback((token: number) => endBreak(token), [endBreak]);

  /**
   * Asks for a break's ad a little ahead (`prefetch`), so the break usually
   * starts with its answer already in hand. Only the small JSON answer: the
   * MP4 itself loads when the break starts. A newer ask replaces an older one.
   */
  const prefetchBreak = useCallback(
    (breakIndex: number, breakAtSeconds: number) => {
      breakDecisionRef.current?.abort.abort();
      const abort = new AbortController();
      breakDecisionRef.current = {
        breakIndex,
        askedAt: performance.now(),
        promise: adService.getMidroll(movieId, breakAtSeconds, { signal: abort.signal }).catch(() => null),
        abort,
      };
    },
    [movieId],
  );

  /**
   * A break fired: pause the movie (its own `pause` handler saves the
   * position), black the picture with "Loading" and take the decision —
   * the one asked ahead when it covers this break and is fresh, otherwise a
   * new one. No ad → the movie resumes at once; an ad → BreakAdLayer plays
   * it. The break was consumed when it fired, so a null answer, a failure or
   * the 8 s backstop never brings it back.
   */
  const beginBreak = useCallback(
    (action: BreakAction) => {
      const nowMs = performance.now();
      breakTokenRef.current += 1;
      const token = breakTokenRef.current;
      const cached = breakDecisionRef.current;
      breakDecisionRef.current = null;
      let decision: Promise<VideoAd | null>;
      let abort: AbortController;
      if (cached && midrollDecisionUsable(cached, action.consumed, nowMs)) {
        decision = cached.promise;
        abort = cached.abort;
      } else {
        cached?.abort.abort();
        abort = new AbortController();
        decision = adService
          .getMidroll(movieId, action.breakAtSeconds, { signal: abort.signal })
          .catch(() => null);
      }
      breakRef.current = {
        token,
        hasAd: false,
        backstop: setTimeout(() => endBreak(token), MIDROLL_DECISION_BACKSTOP_MS),
        abort,
      };
      videoRef.current?.pause();
      setBreakSession({ token, ad: null });
      void decision.then((ad) => {
        const running = breakRef.current;
        if (!running || running.token !== token) return;
        if (running.backstop) clearTimeout(running.backstop);
        running.backstop = null;
        if (!ad) {
          endBreak(token);
          return;
        }
        running.hasAd = true;
        setBreakSession({ token, ad });
      });
    },
    [movieId, endBreak],
  );

  // A title swap (or leaving the page): the decision on its way is dropped,
  // the timers stop and both schedulers go back to nothing — the next title
  // starts its own when its player is built. An ad on the second element is
  // emptied by BreakAdLayer itself, with no event (the backend ages it out).
  useEffect(() => {
    return () => {
      breakDecisionRef.current?.abort.abort();
      breakDecisionRef.current = null;
      const running = breakRef.current;
      if (running) {
        if (running.backstop) clearTimeout(running.backstop);
        running.abort?.abort();
      }
      breakRef.current = null;
      midrollRef.current = MIDROLL_OFF;
      cornerRef.current = CORNER_OFF;
      cornerLedgerRef.current = null;
      durationRef.current = 0;
      setBreakSession(null);
      setBreakMarkers(NO_BREAK_MARKERS);
      setCornerShowing(false);
    };
  }, [movieId]);

  /** One corner event, fire-and-forget; nothing after the corner was closed or failed. */
  const sendCornerEvent = useCallback((event: AdEventName) => {
    const ledger = cornerLedgerRef.current;
    if (!ledger || ledger.final) return;
    if (event === "skipped" || event === "failed") ledger.final = true;
    adService.sendPlaybackEvent(ledger.playbackId, event).catch(() => {});
  }, []);

  /** On screen with the picture loaded: the first time is the impression, each later showing is `shown`. */
  const handleCornerVisible = useCallback(() => {
    const ledger = cornerLedgerRef.current;
    const corner = cornerRef.current;
    if (!ledger || corner.phase !== "showing") return;
    // From here its time on screen counts (tickAdSchedules), never while it was still loading.
    ledger.pictureReady = true;
    if (ledger.reportedShowing >= corner.showings) return;
    const event = ledger.reportedShowing === 0 ? "started" : "shown";
    ledger.reportedShowing = corner.showings;
    sendCornerEvent(event);
  }, [sendCornerEvent]);

  /** A tap on the corner's link: the page opens in a new tab while the movie waits here. */
  const handleCornerOpen = useCallback(() => {
    videoRef.current?.pause();
    sendCornerEvent("clicked");
  }, [sendCornerEvent]);

  /** ✕: gone for the rest of this viewing. */
  const handleCornerClose = useCallback(() => {
    const next = cornerDismiss(cornerRef.current);
    if (next === cornerRef.current) return;
    cornerRef.current = next;
    sendCornerEvent("skipped");
    setCornerShowing(false);
  }, [sendCornerEvent]);

  /** The picture would not load: reported, and no corner for the rest of this viewing. */
  const handleCornerError = useCallback(() => {
    cornerRef.current = cornerFail(cornerRef.current);
    sendCornerEvent("failed");
    setCornerShowing(false);
  }, [sendCornerEvent]);

  /**
   * Safari lets a `<video>` start with sound only after a Play gesture on
   * THAT element. The break ad's element is touched once inside the
   * viewer's first Play (it is still empty, so nothing loads), which is what
   * lets a break start later with no tap of its own.
   */
  const unlockBreakVideo = useCallback(() => {
    const adVideo = adVideoRef.current;
    if (!adVideo || breakUnlockedRef.current === adVideo || !adSessionRef.current?.breaks) return;
    breakUnlockedRef.current = adVideo;
    adVideo.play().catch(() => {});
    adVideo.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // During a break Play / Pause belongs to the ad; with no ad yet, to nothing.
    const running = breakRef.current;
    if (running) {
      const adVideo = adVideoRef.current;
      if (!running.hasAd || !adVideo) return;
      if (adVideo.paused) adVideo.play().catch(() => {});
      else adVideo.pause();
      return;
    }
    unlockBreakVideo();
    // Nothing is on the element until the ad decision is in: a play() now
    // would only fire a hollow `play` event and hide the poster.
    if (adStage === "deciding") return;
    // The first Play of a title with an ad due starts the ad, on this very
    // element; every later press pauses or resumes whatever is on it — the
    // ad included.
    if (adStage === "ready") {
      startAd();
      return;
    }
    if (video.paused) video.play();
    else video.pause();
  }, [adStage, startAd, unlockBreakVideo]);

  // A double-click always fires two native `click` events before the browser
  // recognizes it as one — without this, each click's handler actually runs twice,
  // producing a visible stutter right as the video switches to fullscreen. Delaying
  // the single-click action briefly, and cancelling it if a second click lands within
  // that window, keeps a real single click responsive while letting a double-click go
  // straight to fullscreen with no side effect from the single-click path at all.
  const VIDEO_CLICK_DELAY_MS = 250;

  // Stable (togglePlay only changes with the pre-roll's stage), so the
  // memoised BreakAdLayer can take it for the ad's picture as well.
  const handleVideoClick = useCallback(() => {
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
  }, [togglePlay, resetHideTimer]);

  // Safari's native HLS engine (iOS up to 17.0 — everything newer takes the
  // hls.js path) has no hls.js to report through: the element itself fires
  // `error`. The same one-shot fresh link as the hls.js handler, then the
  // overlay. With hls.js attached the element is fed through MSE and hls.js
  // owns every error, so this stands down.
  const handleNativeError = (event: SyntheticEvent<HTMLVideoElement>) => {
    const playlistUrl = streamInfo?.playlistUrl;
    if (hlsRef.current || !playlistUrl) return;
    const video = event.currentTarget;
    const decision = decideNativeError(video.error?.code, nativeLinkRefetchedRef.current);
    if (decision.action === "ignore") return;
    if (decision.action === "fail") {
      setPlaybackFailure(decision.reason);
      return;
    }
    nativeLinkRefetchedRef.current = true;
    resumePositionRef.current = video.currentTime;
    void refetchStreamLink(playlistUrl).then((renewed) => {
      // A different link is on its way through the effect, which reloads the element.
      if (renewed) return;
      resumePositionRef.current = null;
      setPlaybackFailure("link");
    });
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
  // Every seek the viewer makes (the scrub bar, ±10, the hotkeys) comes
  // through here, so this is where the break scheduler hears of it: a
  // forward seek over breaks is decided once the burst settles.
  const applySeek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      // The movie waits, untouched, while a break holds the picture.
      if (!video || breakRef.current) return;
      const clamped = Math.min(durationSeconds, Math.max(0, time));
      commitMidroll(midrollNoteSeek(midrollRef.current, currentTimeRef.current, clamped, performance.now()));
      video.currentTime = clamped;
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);
    },
    [durationSeconds, commitMidroll],
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

  const handleVideoDoubleClick = useCallback(() => {
    if (videoClickTimeout.current) {
      clearTimeout(videoClickTimeout.current);
      videoClickTimeout.current = null;
    }
    toggleFullscreen();
  }, [toggleFullscreen]);

  // Stable for the memoised BreakAdLayer, like the click handlers above.
  const toggleMute = useCallback(() => setIsMuted((muted) => !muted), []);

  // Every shortcut confirms itself on screen and wakes the control bar, so the
  // keyboard never feels like it's doing something invisible.
  // While an ad plays (before the movie or at a break) only play/pause, mute,
  // fullscreen and volume answer; seeking, theater mode and the next episode
  // wait for the title.
  usePlayerHotkeys(canWatch && Boolean(streamInfo), {
    onTogglePlay: () => {
      if (adStage === "deciding") return;
      const running = breakRef.current;
      // A break still waiting for its ad has nothing to play or pause.
      if (running && !running.hasAd) return;
      const element = running ? adVideoRef.current : videoRef.current;
      const willPlay = (!running && adStage === "ready") || (element?.paused ?? false);
      togglePlay();
      showHud(willPlay ? PlayGlyph : PauseGlyph);
      resetHideTimer();
    },
    onSeekBy: (delta) => {
      // Nothing to seek until the title is on the element; an ad is never seeked.
      if (adStage !== "done" || breakRef.current) return;
      handleSkip(delta);
      showHud(delta > 0 ? ForwardIcon : ReplayIcon, p.seekHud(delta));
      resetHideTimer();
    },
    onSeekToFraction: (fraction) => {
      if (adStage !== "done" || breakRef.current || durationSeconds <= 0) return;
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
    onToggleTheater: () => {
      if (adPlaying || breakRef.current) return;
      setIsTheater((theater) => !theater);
    },
    onNextEpisode: nextEpisode && !adPlaying && !breakActive ? () => goToEpisode(nextEpisode.id) : undefined,
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
  // The synopsis in the site's language (the other one when that is missing);
  // "" for a title with neither, and then the paragraph is left out.
  const description = localizedDescription(movie, language);
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
  const playable = canWatch && !isStreamLoading && !notReadyYet && !streamError && playbackFailure === null;
  /**
   * The title's own HUD (transport, control row, speed & quality, up next)
   * — off while an ad has the picture, before the movie or at a break; the
   * top row and the ad's own chrome (AdOverlay) are what shows then.
   */
  const movieHud = playable && !adPlaying && !breakActive;
  /** Which full-picture message (if any) replaces the HUD — same order as ever. */
  const wall: "processing" | "error" | "guest" | "locked" | null = canWatch
    ? isStreamLoading
      ? null
      : notReadyYet
        ? "processing"
        : streamError || playbackFailure !== null
          ? "error"
          : null
    : isAuthLoading
      ? null
      : isGuest
        ? "guest"
        : "locked";
  // A returning member's profile (or the stream link) is still on its way —
  // or the stream is in hand but the ad decision is not yet (4 s at most).
  const showSpinner = canWatch ? isStreamLoading || (playable && adStage === "deciding") : isAuthLoading;
  // In theater mode the panel floats over the right of the picture, so the HUD
  // makes room for it (desktop only — on phones the panel sits under the video,
  // and fullscreen shows the video element alone).
  const panelFloats = isTheater && railOpen && !isFullscreen;

  /**
   * The corner picture may be seen right now: the tab in front, the player
   * at least half on screen, the movie playing and nothing else on the
   * picture — no ad, no hand-off, no drag, no open menu, no buffering, no
   * message, no "up next", not the last 2 minutes. With a mouse the controls
   * showing do NOT hide it (it sits below their top row and shrinks clear of
   * the centre buttons; a mouse moving to its ✕ brings the controls up, and
   * hiding it then would put the click on the movie); on a touch screen it
   * steps aside while they show. Only seen time counts.
   */
  const cornerCanShow =
    pageVisible &&
    stageOnScreen &&
    (finePointer || !showControls) &&
    isPlaying &&
    !isMenuOpen &&
    !isBuffering &&
    !breakActive &&
    !adPlaying &&
    !adHandoff &&
    !isScrubbing &&
    wall === null &&
    upNextSeconds === null &&
    !cornerNearEnd(currentTime, durationSeconds);

  /**
   * The movie's length for the schedulers — the element's own once known,
   * the catalogue runtime before that — noted for the seek-bar ticks, which
   * are recomputed when it changes.
   */
  const noteScheduleDuration = (video: HTMLVideoElement): number => {
    const duration =
      Number.isFinite(video.duration) && video.duration > 0 ? video.duration : (movieDurationSeconds ?? 0);
    if (duration !== durationRef.current) {
      durationRef.current = duration;
      refreshBreakMarkers(midrollRef.current);
    }
    return duration;
  };

  /**
   * One movie tick for both schedulers (the movie's `timeupdate`, about four
   * a second). Everything here is refs: a render happens only when a break
   * starts, the seek-bar ticks change or the corner starts / ends a showing.
   * Nothing is counted while a break holds the picture.
   */
  const tickAdSchedules = (video: HTMLVideoElement) => {
    if (breakRef.current) return;
    const position = video.currentTime;
    const duration = noteScheduleDuration(video);
    const playing = !video.paused;
    const step = midrollTick(midrollRef.current, {
      position,
      duration,
      playing,
      nowMs: performance.now(),
      scrubbing: isScrubbing,
      // A break crossed behind an open menu or a hidden tab waits (owed) until it can show.
      canInterrupt: !isMenuOpen && document.visibilityState === "visible",
    });
    commitMidroll(step.state);
    if (step.action.kind === "break") {
      beginBreak(step.action);
      return;
    }
    if (step.action.kind === "prefetch") prefetchBreak(step.action.breakIndex, step.action.breakAtSeconds);

    const corner = cornerRef.current;
    const ledger = cornerLedgerRef.current;
    const nextCorner = cornerTick(corner, {
      position,
      duration,
      playing,
      rate: video.playbackRate,
      // A slow picture's loading seconds are not "shown" seconds.
      canShow: cornerCanShow && (ledger?.pictureReady ?? false),
    });
    if (nextCorner === corner) return;
    cornerRef.current = nextCorner;
    const showing = nextCorner.phase === "showing";
    const wasShowing = corner.phase === "showing";
    // A new showing (or the end of one): its picture has to appear again first.
    if (ledger && (showing !== wasShowing || nextCorner.showings !== corner.showings)) {
      ledger.pictureReady = false;
    }
    if (showing !== wasShowing) setCornerShowing(showing);
  };

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
                body:
                  streamError instanceof ApiError
                    ? streamError.message
                    : playbackFailure === "link"
                      ? p.playbackFailedLinkBody
                      : playbackFailure === "media"
                        ? p.playbackFailedMediaBody
                        : p.playbackErrorBody,
              }
            : null;

  const kbd = "h-[22px] rounded-badge bg-raised px-[7px] font-sans text-[12px] leading-[22px] font-bold text-fg-body";

  return (
    <div className="relative flex flex-col pb-24 text-fg">
      <AmbientBackdrop
        videoRef={videoRef}
        posterUrl={movie.coverUrl ?? null}
        seed={movie.title}
        active={hasStarted && !breakActive}
      />

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
          {!hasStarted && !adPlaying && !adHandoff && (
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
              hasStarted || adPlaying || adHandoff ? "opacity-100" : "opacity-0",
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
            // While the ad is on the element every handler takes its ad
            // branch first (isAdActiveRef): nothing the title keeps —
            // hasStarted, the position, the duration, progress saves, up
            // next, link recovery — ever sees the ad's events.
            onPlay={(e) => {
              if (isAdActiveRef.current) {
                setAdPaused(false);
                return;
              }
              // A break holds the movie: nothing (a media key, say) may start it under the ad.
              if (breakRef.current) {
                e.currentTarget.pause();
                return;
              }
              setIsPlaying(true);
              setHasStarted(true);
              setAdHandoffFor(null);
              setUpNextSeconds(null);
            }}
            onPause={(e) => {
              if (isAdActiveRef.current) {
                setAdPaused(true);
                return;
              }
              setIsPlaying(false);
              // The end of the title fires `pause` right before `ended`, which
              // saves on its own — no need to write the same second twice.
              if (!e.currentTarget.ended) saveProgress(true);
            }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={(e) => {
              setIsBuffering(false);
              // The impression: the ad's first frame is on screen. Sent once,
              // however many times playback resumes after a rebuffer.
              if (isAdActiveRef.current) sendAdEvent("started", adEventPosition(e.currentTarget.currentTime));
            }}
            onCanPlay={() => setIsBuffering(false)}
            onTimeUpdate={(e) => {
              if (isAdActiveRef.current) {
                setAdTime(e.currentTarget.currentTime);
                return;
              }
              currentTimeRef.current = e.currentTarget.currentTime;
              setCurrentTime(e.currentTarget.currentTime);
              tickAdSchedules(e.currentTarget);
            }}
            onLoadedMetadata={(e) => {
              if (isAdActiveRef.current) {
                setAdMediaDuration(e.currentTarget.duration);
                return;
              }
              setDurationSeconds(e.currentTarget.duration);
              noteScheduleDuration(e.currentTarget);
            }}
            onEnded={() => {
              if (isAdActiveRef.current) {
                finishAd("completed");
                return;
              }
              saveProgress(true);
              if (nextEpisode) setUpNextSeconds(UP_NEXT_COUNTDOWN_SECONDS);
            }}
            onError={(e) => {
              // The ad's failure is its own: never the title's link recovery,
              // which would renew a stream link that is perfectly fine.
              if (isAdActiveRef.current) {
                finishAd("failed");
                return;
              }
              handleNativeError(e);
            }}
          />

          {/* Scrims: a light veil plus top and bottom fades, only while the HUD shows — never over an ad. */}
          {!wall && !adPlaying && !breakActive && (
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
          {playable && !breakActive && (isBuffering || adHandoff) && (
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-glass" />
          )}

          {/* Ad breaks: the second element, over the paused movie and under the HUD layer. */}
          {hasBreaks && (
            <BreakAdLayer
              videoRef={adVideoRef}
              session={breakSession}
              isMuted={isMuted}
              volume={volume}
              onToggleMute={toggleMute}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              onPictureClick={handleVideoClick}
              onPictureDoubleClick={handleVideoDoubleClick}
              avoidPanel={panelFloats}
              onFinish={handleBreakFinished}
            />
          )}

          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 left-0 z-10",
              panelFloats && "desk:right-[calc(clamp(300px,26vw,380px)+32px)]",
            )}
          >
            <SubtitleOverlay
              lines={breakActive ? NO_SUBTITLE_LINES : subtitleLines}
              style={subtitleStyle}
              liftForControls={showControls}
            />

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
              {movieHud && (
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

            {/* The corner picture, under the connection disc; mounted for one showing at a time. */}
            {cornerShowing && cornerAd && (
              <CornerAd
                imageUrl={cornerAd.imageUrl}
                title={cornerAd.title}
                linkUrl={cornerAd.linkUrl}
                // An ad with no show time stays until closed, so it always has the ✕ (as corner.ts has it).
                closable={cornerAd.closable || cornerAd.showSeconds === null}
                visible={cornerCanShow}
                controlsShown={showControls}
                onOpen={handleCornerOpen}
                onClose={handleCornerClose}
                onVisibleLoaded={handleCornerVisible}
                onError={handleCornerError}
              />
            )}

            {movieHud && !isBuffering && !adHandoff && (
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

            {movieHud && (
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
                  breakMarkers={breakMarkers}
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

            {movieHud && upNextSeconds !== null && nextEpisode && (
              <UpNextOverlay
                episode={nextEpisode}
                secondsRemaining={upNextSeconds}
                totalSeconds={UP_NEXT_COUNTDOWN_SECONDS}
                onPlayNow={() => goToEpisode(nextEpisode.id)}
                onCancel={() => setUpNextSeconds(null)}
              />
            )}

            {adPlaying && prerollAd && (
              <AdOverlay
                title={prerollAd.title}
                secondsLeft={adSecondsLeft(adTime, adMediaDuration, prerollAd.durationSeconds)}
                skip={skipState(prerollAd, adTime)}
                onSkip={() => finishAd("skipped")}
                isPaused={adPaused && !isBuffering}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((m) => !m)}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
              />
            )}

            <PlayerHud message={hud} />

            {playable && !breakActive && (isBuffering || adHandoff) && (
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
                <span className="sr-only">{!isStreamLoading && adStage === "deciding" ? p.loadingAd : p.loadingVideo}</span>
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

          {description && <p className="mt-4 max-w-[68ch] text-body text-fg-body">{description}</p>}

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
