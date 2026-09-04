"use client";

import { useEffect } from "react";

/**
 * Screen Wake Lock for the reader — a page of text produces no media
 * activity, so a long read is exactly when the OS decides to sleep.
 *
 * Silent no-op wherever the API is missing or refuses (unsupported browser,
 * battery saver, insecure context): the reader must never care. The lock is
 * auto-released by the browser when the tab hides, so a visibilitychange
 * listener re-requests it when the reader returns.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          // The effect cleaned up while the request was in flight.
          lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
      } catch {
        // Denied or unavailable — reading continues, the screen just sleeps.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        sentinel?.release().catch(() => {});
      } catch {
        // Already released.
      }
      sentinel = null;
    };
  }, [enabled]);
}
