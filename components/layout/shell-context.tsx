"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * What a page can tell the Marquee shell, and what it can ask of it.
 *
 * - useTopBarOverHero()  "I start with a full-bleed hero": while the calling
 *                        component is mounted the top bar is transparent at
 *                        the top of the page and fades to frosted glass
 *                        between 150px and 250px of scroll. <HeroShell>
 *                        calls it for you.
 * - <TopBarSlot>         content rendered INSIDE the sticky top-bar wrapper,
 *                        under the 72px header (a page-level sub-bar).
 * - useShellFeedback()   opens the one shared "Send feedback" dialog.
 *
 * All three are safe outside the shell (player, reader): they do nothing.
 */
interface ShellContextValue {
  overHero: boolean;
  registerHero: () => () => void;
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
  openFeedback: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({
  children,
  onOpenFeedback,
}: {
  children: ReactNode;
  onOpenFeedback: () => void;
}) {
  const [heroCount, setHeroCount] = useState(0);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  const registerHero = useCallback(() => {
    setHeroCount((n) => n + 1);
    return () => setHeroCount((n) => Math.max(0, n - 1));
  }, []);

  const value = useMemo<ShellContextValue>(
    () => ({ overHero: heroCount > 0, registerHero, slot, setSlot, openFeedback: onOpenFeedback }),
    [heroCount, registerHero, slot, onOpenFeedback],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

/** Internal: the shell's own read of the state. */
export function useShellState() {
  return useContext(ShellContext);
}

/**
 * Call from a page (or its hero) that starts with a full-bleed hero under
 * the bar. Pass `false` to switch it off conditionally (e.g. while the hero
 * is still loading and a plain skeleton shows instead).
 */
export function useTopBarOverHero(enabled = true) {
  const ctx = useContext(ShellContext);
  const register = ctx?.registerHero;
  // Layout effect: the bar turns transparent before the first paint.
  useLayoutEffect(() => {
    if (!enabled || !register) return;
    return register();
  }, [enabled, register]);
}

/** Renders its children inside the sticky top-bar wrapper, under the header. */
export function TopBarSlot({ children }: { children: ReactNode }) {
  const ctx = useContext(ShellContext);
  if (!ctx?.slot) return null;
  return createPortal(children, ctx.slot);
}

/** Opens the shared feedback dialog (no-op outside the shell). */
export function useShellFeedback(): () => void {
  const ctx = useContext(ShellContext);
  return ctx?.openFeedback ?? noop;
}

function noop() {}
