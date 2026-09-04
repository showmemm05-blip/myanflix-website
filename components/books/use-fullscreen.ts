"use client";

import { useSyncExternalStore, type RefObject } from "react";

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

const subscribeNever = () => () => {};

/**
 * Fullscreen API wrapper for the readers (the player precedent).
 * `supported` is false on the server and during hydration, resolving after
 * mount — the settings panel hides the control until it's true, which also
 * covers iPhone Safari where element fullscreen doesn't exist.
 */
export function useFullscreen(target?: RefObject<HTMLElement | null>) {
  const active = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(document.fullscreenElement),
    () => false,
  );
  // Static per-browser, but still read through the store so the server
  // snapshot (false) and the client value reconcile without an effect.
  const supported = useSyncExternalStore(
    subscribeNever,
    () => Boolean(document.fullscreenEnabled),
    () => false,
  );

  // Every call guarded: a request outside a user gesture, or an exit with
  // nothing fullscreen, rejects — neither is worth surfacing.
  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      const el = target?.current ?? document.documentElement;
      el.requestFullscreen().catch(() => {});
    }
  };

  return { supported, active, toggle };
}
