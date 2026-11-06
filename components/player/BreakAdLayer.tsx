"use client";

import { memo, useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { AdOverlay } from "@/components/player/AdOverlay";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import {
  PREROLL_STALL_MS,
  adEventPosition,
  adSecondsLeft,
  claimAdEvent,
  createAdEventLedger,
  skipState,
  type AdEventLedger,
  type AdFinishReason,
} from "@/lib/player/preroll";
import { cn } from "@/lib/utils";
import { adService, type VideoAd } from "@/services/api/adService";
import styles from "./player.module.css";

/** One break, as the page runs it: `ad` is null while its decision is on the way. */
export interface BreakSession {
  token: number;
  ad: VideoAd | null;
}

interface BreakAdLayerProps {
  /** The second `<video>` — the page keeps the ref so the first Play gesture can unlock it (Safari). */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** The break in progress, or null between breaks (the layer then sits invisible and inert). */
  session: BreakSession | null;
  isMuted: boolean;
  /** 0–100, the viewer's volume. */
  volume: number;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** The movie's own click handlers: one click pauses / resumes the ad, a double click is fullscreen. */
  onPictureClick: () => void;
  onPictureDoubleClick: () => void;
  /** The episode panel floats over the right of the picture: the ad's chrome makes room for it. */
  avoidPanel: boolean;
  /** The ad is over, whichever way; the page resumes the movie. Called once per ad. */
  onFinish: (token: number, reason: AdFinishReason) => void;
}

/** The play this layer is running — cleared the moment it finishes, so every late element event is ignored. */
interface ActivePlay {
  token: number;
  ledger: AdEventLedger;
}

/**
 * Takes the ad off the element: drops its buffered data and its connection,
 * so nothing keeps downloading behind the movie.
 */
function emptyElement(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute("src");
  video.load();
}

/**
 * A mid-roll break (lib/player/midroll.ts): the ad plays on a SECOND
 * `<video>`, over the paused movie, so the movie keeps its buffer, quality,
 * subtitles and hls.js instance and simply plays on afterwards. Black with a
 * "Loading" pill while the decision is on its way, then the ad with the
 * pre-roll's own chrome (AdOverlay) and a note that the movie continues.
 *
 * Its clock, pause and buffering state live here, so the 4-per-second ad
 * ticks re-render this layer only — and only while an ad runs. Between
 * breaks it is an empty element: invisible, inert and loading nothing.
 */
export const BreakAdLayer = memo(function BreakAdLayer({
  videoRef,
  session,
  isMuted,
  volume,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
  onPictureClick,
  onPictureDoubleClick,
  avoidPanel,
  onFinish,
}: BreakAdLayerProps) {
  const p = useSection(playText);
  const activeRef = useRef<ActivePlay | null>(null);
  const [time, setTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(false);
  /** The ad's first frame has been on screen; until then it counts as loading (pill and stall watch). */
  const [hasFrame, setHasFrame] = useState(false);
  /** The browser refused the ad with sound, so it runs muted until the viewer unmutes it (a click). */
  const [soundBlocked, setSoundBlocked] = useState(false);
  // The start effect runs once per ad, so it reads the viewer's sound settings
  // and the page's callback through refs — a new callback must never restart the ad.
  const soundRef = useRef({ isMuted, volume });
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    soundRef.current = { isMuted, volume };
    onFinishRef.current = onFinish;
  }, [isMuted, volume, onFinish]);

  const ad = session?.ad ?? null;
  const token = session?.token ?? 0;
  const loading = ad === null || buffering || !hasFrame;

  /** The end of the ad (completed, skipped, failed): runs once, reports it, empties the element. */
  const finish = useCallback(
    (reason: AdFinishReason) => {
      const active = activeRef.current;
      if (!active) return;
      activeRef.current = null;
      const video = videoRef.current;
      if (claimAdEvent(active.ledger, reason)) {
        adService
          .sendPlaybackEvent(active.ledger.playbackId, reason, adEventPosition(video?.currentTime))
          .catch(() => {});
      }
      if (video) emptyElement(video);
      onFinishRef.current(active.token, reason);
    },
    [videoRef],
  );

  // Puts the ad on the element and plays it. The element was unlocked inside
  // the viewer's first Play gesture (the page's togglePlay), which is what
  // lets Safari start it now, mid-movie, with no tap of its own. A browser
  // that still refuses sound gets the ad muted, with the mute button to
  // bring the sound back; refused even muted, the ad is failed and the movie
  // carries on.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ad) return;
    const play: ActivePlay = { token, ledger: createAdEventLedger(ad.playbackId) };
    activeRef.current = play;
    video.src = ad.videoUrl;
    // An ad never runs at the viewer's 1.5×.
    video.playbackRate = 1;
    video.volume = soundRef.current.volume / 100;
    video.muted = soundRef.current.isMuted;
    video.play().catch((error: unknown) => {
      if (activeRef.current !== play) return;
      if (error instanceof DOMException && error.name === "NotAllowedError" && !video.muted) {
        video.muted = true;
        setSoundBlocked(true);
        video.play().catch(() => {
          if (activeRef.current === play) finish("failed");
        });
        return;
      }
      // Anything else (an interrupted load, say) leaves it paused: the paused
      // hint shows and a click tries again; a real media error ends it below.
      setPaused(true);
    });
    return () => {
      // The page ended the break first (an episode swap, leaving the page): no event, the backend ages the play out.
      if (activeRef.current === play) {
        activeRef.current = null;
        emptyElement(video);
      }
      setTime(0);
      setMediaDuration(0);
      setPaused(false);
      setBuffering(false);
      setHasFrame(false);
      setSoundBlocked(false);
    };
  }, [videoRef, ad, token, finish]);

  // The viewer's volume and mute follow onto the ad element; a sound block keeps it muted until it is lifted.
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.volume = volume / 100;
  }, [videoRef, volume]);
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = isMuted || soundBlocked;
  }, [videoRef, isMuted, soundBlocked]);

  // An ad that cannot get going must not hold the movie hostage: 10 s of
  // loading or buffering while it is meant to be playing and it is given up
  // as failed. The viewer's own pause is not a stall.
  useEffect(() => {
    if (!ad || !loading || paused) return;
    const timer = setTimeout(() => finish("failed"), PREROLL_STALL_MS);
    return () => clearTimeout(timer);
  }, [ad, loading, paused, finish]);

  const toggleMute = () => {
    if (!soundBlocked) {
      onToggleMute();
      return;
    }
    // This click is the gesture the browser wanted: unmute right here, inside it.
    setSoundBlocked(false);
    if (videoRef.current) videoRef.current.muted = false;
    if (isMuted) onToggleMute();
  };

  return (
    <div
      aria-hidden={session ? undefined : true}
      className={cn("absolute inset-0 z-[5] bg-black", !session && "pointer-events-none invisible")}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 size-full cursor-pointer object-contain"
        // On the element, not the layer: a click on the ad's own buttons must not also pause it.
        onClick={session ? onPictureClick : undefined}
        onDoubleClick={session ? onPictureDoubleClick : undefined}
        playsInline
        preload="none"
        disablePictureInPicture
        disableRemotePlayback
        // Every handler stands down unless an ad is running: the page's
        // unlock play/pause and the emptying after an ad report nothing.
        onPlay={() => {
          if (activeRef.current) setPaused(false);
        }}
        onPause={() => {
          if (activeRef.current) setPaused(true);
        }}
        onWaiting={() => {
          if (activeRef.current) setBuffering(true);
        }}
        onPlaying={(e) => {
          const active = activeRef.current;
          if (!active) return;
          setBuffering(false);
          setHasFrame(true);
          // The impression: the ad's first frame is on screen. Sent once,
          // however many times playback resumes after a rebuffer.
          if (claimAdEvent(active.ledger, "started")) {
            adService
              .sendPlaybackEvent(active.ledger.playbackId, "started", adEventPosition(e.currentTarget.currentTime))
              .catch(() => {});
          }
        }}
        onCanPlay={() => {
          if (activeRef.current) setBuffering(false);
        }}
        onTimeUpdate={(e) => {
          if (activeRef.current) setTime(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => {
          if (activeRef.current) setMediaDuration(e.currentTarget.duration);
        }}
        onEnded={() => finish("completed")}
        onError={() => finish("failed")}
      />

      {session && loading && !(ad && paused) && (
        <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 items-center gap-2.5 rounded-full bg-art-badge px-[18px] text-sm font-bold text-fg backdrop-blur-[14px]">
            <span aria-hidden className="flex gap-[5px]">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </span>
            {hasFrame ? p.buffering : p.loadingAd}
          </span>
        </div>
      )}

      {ad && (
        // AdOverlay's root covers the picture; here the clicks must reach the
        // layer (pause / resume), so only its own buttons take the pointer.
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            avoidPanel && "desk:right-[calc(clamp(300px,26vw,380px)+32px)]",
          )}
        >
          <AdOverlay
            title={ad.title}
            secondsLeft={adSecondsLeft(time, mediaDuration, ad.durationSeconds)}
            skip={skipState(ad, time)}
            onSkip={() => finish("skipped")}
            isPaused={paused}
            isMuted={isMuted || soundBlocked}
            onToggleMute={toggleMute}
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
            note={p.adBreakNote}
          />
        </div>
      )}
    </div>
  );
});
