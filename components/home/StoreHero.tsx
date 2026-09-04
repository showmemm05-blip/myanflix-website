"use client";

import { AnimatePresence, motion, useReducedMotion, type Transition } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { StoreBadge } from "@/components/home/StoreBadge";
import { StoreSection } from "@/components/home/StoreSection";
import { Kicker } from "@/components/system/Kicker";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { formatCompactNumber } from "@/lib/format";
import { GAME_HREF, HERO_ROTATION } from "@/lib/home/store";
import { headingLeading, kickerTracking, SLUG } from "@/lib/home/type";
import { cn } from "@/lib/utils";

/**
 * THE MARQUEE — a six-game cinematic stage at the top of the Arcade.
 *
 * The artwork is picsum, not commissioned key art, so the cinema comes from
 * everything around it: the slow CSS drift, the layered background-token
 * scrims, display-scale type, and the one violet particle field. All idle
 * motion is CSS (`mf-store-drift` / `mf-store-float`), which the global
 * reduced-motion guard neutralises for free; the ONE piece of JS motion is
 * the auto-advance clock below, and its rules are law.
 */

const ADVANCE_MS = 7000;

/**
 * The particle field, fixed at module scope: seven positions hand-placed to
 * drift in the stage's darker regions (upper half, away from the content
 * block). Classes are literal — only the placement and phase vary, and those
 * are inline styles, which Tailwind never needs to see.
 */
const PARTICLES: ReadonlyArray<{
  left: string;
  top: string;
  delay: string;
  duration: string;
}> = [
  { left: "8%", top: "22%", delay: "0s", duration: "9s" },
  { left: "21%", top: "12%", delay: "-2.5s", duration: "11s" },
  { left: "38%", top: "30%", delay: "-5s", duration: "8s" },
  { left: "55%", top: "16%", delay: "-1.5s", duration: "12s" },
  { left: "68%", top: "36%", delay: "-7s", duration: "9.5s" },
  { left: "82%", top: "20%", delay: "-4s", duration: "10.5s" },
  { left: "92%", top: "42%", delay: "-6.5s", duration: "8.5s" },
];

export function StoreHero() {
  const { t, language } = useLanguage();
  const total = HERO_ROTATION.length;

  const [index, setIndex] = React.useState(0);
  // Pause inputs are tracked separately so any one of them can lift without
  // clobbering the others (a hover ending must not resume a focused carousel).
  const [hoverPaused, setHoverPaused] = React.useState(false);
  const [focusPaused, setFocusPaused] = React.useState(false);
  const [pointerHeld, setPointerHeld] = React.useState(false);
  const [docHidden, setDocHidden] = React.useState(false);
  const reducedMotion = useReducedMotion();

  // Only the very first paint of slide 1 deserves `priority` — after any
  // rotation the images are warm and fetchpriority=high would just lie to
  // the browser. State, not a ref: the value is read during render, and every
  // write already rides a setIndex re-render, so the extra set batches free.
  const [hasRotated, setHasRotated] = React.useState(false);
  const pointerStartX = React.useRef<number | null>(null);

  const goTo = React.useCallback(
    (next: number) => {
      setHasRotated(true);
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  React.useEffect(() => {
    const update = () => setDocHidden(document.visibilityState === "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  /**
   * THE TIMER RULES (the SpotlightHero bug must not ship twice): the global
   * CSS guard collapses the crossfade to 0.01ms under reduced motion, so a
   * running interval would become a hard flash-rotation — the interval must
   * never exist, not merely animate gently. It also clears while hovered,
   * focused, pressed, or while the tab is hidden.
   */
  const running =
    !reducedMotion && !hoverPaused && !focusPaused && !pointerHeld && !docHidden;

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setHasRotated(true);
      setIndex((i) => (i + 1) % total);
    }, ADVANCE_MS);
    // `index` in the deps is the manual-nav reset: any navigation tears the
    // interval down and grants the new slide its full seven seconds.
    return () => window.clearInterval(id);
  }, [running, index, total]);

  const game = HERO_ROTATION[index];

  // Reduced motion swaps slides instantly — no flash, because the clock
  // above never runs; only a user's own click changes the slide.
  const slideTransition: Transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.7, ease: [0.16, 1, 0.3, 1] };

  return (
    <StoreSection
      rule={false}
      pad="none"
      // Breathing room above the stage — the marquee should not sit pressed
      // against the top of the page. Deliberately the SAME ladder every other
      // section opens with (pt-10 sm:pt-14), one step up at lg: a flat 100px
      // was tried and read as the page starting late — on a phone it stacked
      // on the 56px top bar into 156px of nothing, and on desktop it was a
      // bigger gap than any section break below it, which broke the rhythm.
      className="pt-10 sm:pt-14 lg:pt-16"
      role="region"
      aria-roledescription="carousel"
      aria-label={t.home.store.hero.regionLabel}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goTo(index - 1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          goTo(index + 1);
        }
      }}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => setFocusPaused(true)}
      onBlurCapture={(e) => {
        // Focus moving BETWEEN controls inside the carousel must keep it
        // paused; only focus leaving the region entirely restarts the clock.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocusPaused(false);
        }
      }}
    >
      {/* The stage. Mobile gets a tall immersive plate; the ratio widens as
          the viewport does. sm:min-h-0 releases the mobile floor so
          aspect-video is honest on tablets. */}
      <div
        className="relative isolate aspect-[4/5] min-h-[440px] overflow-hidden rounded-lg ring-1 ring-white/10 ring-inset sm:aspect-video sm:min-h-0 lg:aspect-[21/9] lg:max-h-[620px] lg:rounded-xl"
        onPointerDown={(e) => {
          pointerStartX.current = e.clientX;
          setPointerHeld(true);
        }}
        onPointerUp={(e) => {
          const start = pointerStartX.current;
          pointerStartX.current = null;
          setPointerHeld(false);
          if (start === null) return;
          const dx = e.clientX - start;
          if (Math.abs(dx) > 48) goTo(dx < 0 ? index + 1 : index - 1);
        }}
        // A mouse gets no implicit pointer capture: press on the stage, drag
        // off, release outside, and pointerup never fires here — pointerHeld
        // would latch true and quietly kill the auto-advance for the rest of
        // the visit. Leaving the stage is as good a signal as releasing.
        onPointerLeave={() => setPointerHeld(false)}
        onPointerCancel={() => {
          pointerStartX.current = null;
          setPointerHeld(false);
        }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={game.id}
            role="group"
            aria-roledescription="slide"
            aria-label={t.home.store.hero.slideLabel(index + 1, total)}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={slideTransition}
          >
            {/* Idle pan lives on a wrapper, not the Image, so the crossfade's
                framer scale and the CSS drift never fight over one transform. */}
            <div aria-hidden className="mf-store-drift absolute inset-0">
              <Image
                fill
                priority={index === 0 && !hasRotated}
                src={game.heroArtworkUrl}
                alt=""
                sizes="(min-width:1024px) min(100vw - 72px, 1536px), 100vw"
                className="object-cover"
                draggable={false}
              />
            </div>
            {/* Readability scrims — background-token family only, per the
                identity rules. The left wash is desktop-only, where the
                content block hugs the left half. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent"
            />
            <div
              aria-hidden
              className="absolute inset-0 hidden bg-gradient-to-r from-background/85 via-background/30 to-transparent lg:block"
            />

            <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-8 lg:max-w-[56%] lg:p-12">
              <div className="flex flex-wrap items-center gap-2">
                {game.badge !== null && <StoreBadge kind={game.badge} />}
                {game.playersOnline !== null && (
                  <StoreBadge kind="online">
                    {/* Figure in mono, word in sans — the storefront-wide split. */}
                    <span className="nums font-mono">
                      {formatCompactNumber(game.playersOnline)}
                    </span>
                  </StoreBadge>
                )}
              </div>

              <Kicker className="mt-4" style={kickerTracking(language)}>
                {t.home.store.hero.kicker}
              </Kicker>

              {/* The page's one h1. The title is a Latin proper noun, but the
                  leading fix stays unconditional — cheap, and correct the day
                  a title carries Myanmar script. */}
              <h1
                className="text-display mt-2 max-w-[18ch]"
                style={headingLeading(language, "display")}
              >
                {game.title}
              </h1>

              <p
                className="mt-3 line-clamp-2 max-w-[52ch] text-sm text-foreground/75 sm:line-clamp-3 sm:text-base"
                style={headingLeading(language, "deck")}
              >
                {t.home.store.gameCopy[game.descriptionKey]}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={SLUG}>{game.releaseYear}</span>
                <span aria-hidden className="text-xs text-white/25">
                  ·
                </span>
                <span className={SLUG}>{game.platforms.join(" · ")}</span>
                {game.rating !== null && (
                  <>
                    <span aria-hidden className="text-xs text-white/25">
                      ·
                    </span>
                    <span className={cn(SLUG, "flex items-center gap-1 text-premium")}>
                      <Star aria-hidden className="size-3 fill-current" />
                      {game.rating.toFixed(1)}
                    </span>
                  </>
                )}
                <span aria-hidden className="text-xs text-white/25">
                  ·
                </span>
                {/* Genre is a word, so it leaves the mono slug voice. */}
                <span className="text-xs text-muted-foreground">{game.genre}</span>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                {t.home.store.hero.byStudio(game.studio)}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  variant="onArt"
                  size="pill"
                  render={<Link href={GAME_HREF} />}
                  nativeButton={false}
                >
                  <Play className="size-4 fill-current" />
                  {t.home.store.hero.explore}
                </Button>
                <Button
                  variant="outline"
                  size="pill"
                  render={<Link href="#store-featured" />}
                  nativeButton={false}
                >
                  {t.home.store.hero.allGames}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* The particle field — a few positioned spans on a CSS keyframe, not
            a canvas: cheap, decorative, and frozen by the global guard. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] hidden lg:block">
          {PARTICLES.map((p) => (
            <span
              key={p.left}
              className="mf-store-float absolute size-1 rounded-full bg-primary/40 blur-[1px]"
              style={{
                left: p.left,
                top: p.top,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>

        {/* Desktop thumbnail rail. Real buttons, named by game title. */}
        {/* xl-up, not lg-up: at 1024–~1230px the stage is ~888–1090px wide and
            a six-thumb rail overlaps the CTA row and steals its clicks — the
            reviewers proved it from the class arithmetic. From xl the stage is
            ≥1144px and the slimmer thumbs below leave the rail's left edge
            ~100px clear of even the longer Burmese CTA labels; below xl the
            dot controls (which already serve mobile) carry the same job. */}
        <div className="absolute right-8 bottom-8 z-10 hidden items-end gap-2 xl:flex">
          {HERO_ROTATION.map((g, i) => (
            <button
              key={g.id}
              type="button"
              aria-label={t.home.store.hero.goTo(g.title)}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={cn(
                "relative aspect-video overflow-hidden rounded-md transition-all duration-300 ease-aurora outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === index
                  ? "w-28 ring-2 ring-primary"
                  : "w-24 opacity-60 ring-1 ring-white/15 hover:opacity-100",
              )}
            >
              <Image
                fill
                src={g.artworkUrl}
                alt=""
                sizes="128px"
                className="object-cover"
                draggable={false}
              />
              {/* The progress line exists ONLY while the clock actually runs —
                  a filling bar over a stopped timer would be fake urgency. */}
              {i === index && running && (
                <motion.div
                  key={index}
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: ADVANCE_MS / 1000, ease: "linear" }}
                  className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-primary"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Below-stage controls where the thumb rail has no room: prev / dots /
          next. Hidden from lg up — the rail takes over there. */}
      <div className="mt-4 flex items-center justify-center gap-3 xl:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.home.store.hero.prev}
          onClick={() => goTo(index - 1)}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          {HERO_ROTATION.map((g, i) => (
            <button
              key={g.id}
              type="button"
              aria-label={t.home.store.hero.goTo(g.title)}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-white/25",
              )}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.home.store.hero.next}
          onClick={() => goTo(index + 1)}
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </StoreSection>
  );
}
