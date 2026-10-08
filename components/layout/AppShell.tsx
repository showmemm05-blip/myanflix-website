"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { Footer } from "@/components/footer/Footer";
import { Dock } from "@/components/layout/Dock";
import { MediaChipStrip } from "@/components/layout/MediaChipStrip";
import { AuthTopBarHeader, TopBarHeader } from "@/components/layout/TopBar";
import { ShellProvider, useShellState } from "@/components/layout/shell-context";
import { isAuthRoute, isImmersiveRoute, isMediaHubRoute } from "@/components/system/nav";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";

// The shared feedback dialog is closed until "Help & feedback" is pressed, so
// its code is fetched on first open instead of with every page.
const FeedbackDialog = dynamic(
  () => import("@/components/dialogs/FeedbackDialog").then((mod) => mod.FeedbackDialog),
  { ssr: false },
);

/**
 * THE MARQUEE APP SHELL (SHELL.md, DesignSystem "Top bar" / "Phone width").
 *
 * - A sticky 72px top bar (60px on phones): wordmark, Home · Media · Wallet ·
 *   Profile with the crimson active pill, search, the notifications bell,
 *   the green balance pill and the avatar menu — or a white "Sign in" when
 *   signed out. Transparent over a page's hero (pages say so with
 *   useTopBarOverHero / <HeroShell>), frosted glass from 150→250px of
 *   scroll; pages without a hero get glass from the start.
 * - The Media chip strip under the bar on every /media page.
 * - Under 720px the floating dock replaces the nav, and content keeps 104px
 *   clear at the bottom.
 * - The quiet footer on long pages; one shared feedback dialog.
 * - Sign-in pages get the minimal bar (logo + language); the player gets no
 *   chrome at all (full screen).
 * - A skip link to the main content.
 *
 * It sets `--shell-bar-h` (bar + chip strip height) so heroes can pull up
 * under the bar (`under-bar`) and sub-bars can stick under it
 * (`sticky-under-bar`).
 */
export function AppShell({
  children,
  showFooter = true,
}: {
  children: React.ReactNode;
  /** false hides the footer (pages where nothing should sit below the content). */
  showFooter?: boolean;
}) {
  const pathname = usePathname();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // Mounted from the first open on (so it can animate closed).
  const [feedbackMounted, setFeedbackMounted] = useState(false);
  const openFeedback = useCallback(() => {
    setFeedbackMounted(true);
    setFeedbackOpen(true);
  }, []);

  const immersive = isImmersiveRoute(pathname);
  const auth = isAuthRoute(pathname);

  return (
    <ShellProvider onOpenFeedback={openFeedback}>
      {immersive ? (
        // The player is full screen: no bar, no dock, no footer.
        <main id="main-content" tabIndex={-1} className="outline-none">
          {children}
        </main>
      ) : (
        <ShellFrame variant={auth ? "auth" : "default"} showFooter={showFooter && !auth}>
          {children}
        </ShellFrame>
      )}
      {feedbackMounted && <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />}
    </ShellProvider>
  );
}

function ShellFrame({
  children,
  variant,
  showFooter,
}: {
  children: React.ReactNode;
  variant: "default" | "auth";
  showFooter: boolean;
}) {
  const pathname = usePathname();
  const s = useSection(shellText);
  const shell = useShellState();
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const withStrip = variant === "default" && isMediaHubRoute(pathname);
  const overHero = variant === "default" && Boolean(shell?.overHero);
  const setSlot = shell?.setSlot;

  // Glass: transparent over a hero at the top, fading to frosted glass
  // between 150px and 250px of scroll. Written straight to the element's
  // style on animation frames, so scrolling never re-renders React. A layout
  // effect, so a hero page never paints one frame of glass first after the
  // code starts; before that, the `[data-shell-root]:has(.under-bar)` rule
  // in globals.css keeps the server-rendered bar clear over a hero.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const amount = overHero ? Math.min(1, Math.max(0, (window.scrollY - 150) / 100)) : 1;
      bar.style.setProperty("--glass-a", amount.toFixed(3));
      bar.dataset.glass = amount > 0 ? "on" : "off";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [overHero]);

  // Keep --shell-bar-h equal to the real sticky wrapper (bar + strip + any
  // page sub-bar), so `under-bar` heroes and `sticky-under-bar` toolbars line
  // up exactly. The CSS classes below give the right value before hydration.
  useLayoutEffect(() => {
    const bar = barRef.current;
    const root = rootRef.current;
    if (!bar || !root || typeof ResizeObserver === "undefined") return;
    const sync = () => root.style.setProperty("--shell-bar-h", `${Math.round(bar.getBoundingClientRect().height)}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--shell-bar-h");
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-shell-root=""
      className={cn(
        "relative flex min-h-screen flex-col bg-ground text-fg [overflow-x:clip]",
        withStrip
          ? "[--shell-bar-h:124px] max-desk:[--shell-bar-h:112px]"
          : "[--shell-bar-h:72px] max-desk:[--shell-bar-h:60px]",
        variant === "default" && "pb-dock",
      )}
    >
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-[12px] bg-play px-4 py-3 text-[15px] font-extrabold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-offset-2 focus:outline-link"
      >
        {s.skipToContent}
      </a>

      <div
        ref={barRef}
        // Server HTML: glass, unless the page opens with an `under-bar` hero
        // (globals.css clears the bar for that case before any code runs).
        // From then on the layout effect above drives --glass-a/data-glass.
        data-shell-bar=""
        className="sticky top-0 z-50 transition-[background-color] duration-[250ms] [--glass-a:1]"
        style={{
          backgroundColor: "rgba(8, 8, 11, calc(0.4 * var(--glass-a)))",
          WebkitBackdropFilter: "blur(calc(24px * var(--glass-a))) saturate(calc(1 + 0.4 * var(--glass-a)))",
          backdropFilter: "blur(calc(24px * var(--glass-a))) saturate(calc(1 + 0.4 * var(--glass-a)))",
        }}
      >
        {variant === "auth" ? <AuthTopBarHeader /> : <TopBarHeader />}
        {withStrip && <MediaChipStrip />}
        {/* Pages can portal a sub-bar in here with <TopBarSlot>. */}
        <div ref={setSlot} />
      </div>

      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>

      {showFooter && <Footer />}

      {variant === "default" && <Dock />}
    </div>
  );
}
