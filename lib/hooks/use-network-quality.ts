"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type Hls from "hls.js";

export type NetworkQuality = "good" | "slow" | "offline";

// Mirrors the bandwidth tiers lib/streaming/PrefetchController.ts already
// uses to drive prefetch concurrency — hls.bandwidthEstimate is the same
// honest, cache-corrected signal (see HlsCacheLoader), so the indicator
// reads as consistent with how the player itself is actually behaving.
const SLOW_BANDWIDTH_BPS = 3_000_000;

const POLL_INTERVAL_MS = 1000;
const STALL_WINDOW_MS = 30_000;
const STALL_THRESHOLD = 2;
const RECONNECT_WINDOW_MS = 30_000;
const RECONNECT_THRESHOLD = 2;

// hls.js reports `bandwidthEstimate` as its EWMA config default
// (abrEwmaDefaultEstimate, 500 Kbps) until real fragments have actually been
// timed — well under our "slow" threshold, so trusting it before any samples
// exist would flag every playback start as slow for no real reason.
const MIN_BANDWIDTH_SAMPLES = 2;

interface UseNetworkQualityOptions {
  hlsRef: RefObject<Hls | null>;
  isBuffering: boolean;
  /** Count of hls.js FRAG_LOADED events so far — gates when bandwidthEstimate is trustworthy. */
  loadedFragmentCountRef: RefObject<number>;
  /** Only observe once playback has actually started — nothing meaningful to report before that. */
  active: boolean;
}

/**
 * Derives a coarse green/yellow/red network quality from signals already
 * available around the player: hls.js's bandwidth estimate, repeated
 * buffering stalls, and browser online/offline flips (including frequent
 * reconnections). Polled rather than event-driven so a recovered connection
 * downgrades back to "good" on its own within ~1s, with no manual dismiss.
 */
export function useNetworkQuality({
  hlsRef,
  isBuffering,
  loadedFragmentCountRef,
  active,
}: UseNetworkQualityOptions): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>("good");
  const stallTimestamps = useRef<number[]>([]);
  const reconnectTimestamps = useRef<number[]>([]);
  const wasBuffering = useRef(false);

  // Each buffering-start (not every tick while it's still buffering) counts as one stall.
  useEffect(() => {
    if (active && isBuffering && !wasBuffering.current) {
      stallTimestamps.current.push(Date.now());
    }
    wasBuffering.current = isBuffering;
  }, [isBuffering, active]);

  useEffect(() => {
    if (!active) return;

    const handleOnline = () => {
      reconnectTimestamps.current.push(Date.now());
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [active]);

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuality("good");
      return;
    }

    const evaluate = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setQuality("offline");
        return;
      }

      const now = Date.now();
      stallTimestamps.current = stallTimestamps.current.filter((t) => now - t < STALL_WINDOW_MS);
      reconnectTimestamps.current = reconnectTimestamps.current.filter((t) => now - t < RECONNECT_WINDOW_MS);

      const repeatedStalls = stallTimestamps.current.length >= STALL_THRESHOLD;
      const frequentReconnects = reconnectTimestamps.current.length >= RECONNECT_THRESHOLD;
      const hasRealSamples = (loadedFragmentCountRef.current ?? 0) >= MIN_BANDWIDTH_SAMPLES;
      const bandwidth = hlsRef.current?.bandwidthEstimate;
      const slowBandwidth =
        hasRealSamples && typeof bandwidth === "number" && bandwidth > 0 && bandwidth < SLOW_BANDWIDTH_BPS;

      setQuality(repeatedStalls || frequentReconnects || slowBandwidth ? "slow" : "good");
    };

    evaluate();
    const interval = setInterval(evaluate, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [active, hlsRef, loadedFragmentCountRef]);

  return quality;
}
