"use client";

import Link from "next/link";
import * as React from "react";
import { useReducedMotion } from "framer-motion";

import { GameArt, gameArtBg } from "@/components/home/arcade/GameArt";
import { StoreBadge } from "@/components/home/arcade/StoreBadge";
import { useTopBarOverHero } from "@/components/layout/shell-context";
import { ChevronLeftIcon, ChevronRightIcon, GridComfortableIcon, PlayIcon } from "@/components/system/icons";
import { Rating } from "@/components/system/Tag";
import { buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { formatCompactNumber } from "@/lib/format";
import { GAME_HREF, HERO_ROTATION } from "@/lib/home/store";
import { headingLeading } from "@/lib/home/type";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { cn } from "@/lib/utils";

/**
 * THE FEATURED-GAMES HERO (Main.dc.html §1) — a six-game carousel, full
 * width, pulled up under the see-through top bar.
 *
 * Art: the game's Marquee scene (inline SVG, no request) settles in on each
 * change; the copy rises in. The board's three scrims sit over it.
 *
 * Controls:
 * - from 1200px: a "1 of 6" counter, prev / next discs and six 16:9
 *   thumbnails bottom-right; the active one has a crimson ring and a 3px
 *   progress line that fills over the 7 seconds;
 * - under 1200px: the app's prev / dots / next row under the hero;
 * - ←/→ anywhere in the carousel, and a horizontal swipe on the art.
 *
 * THE TIMER RULES (unchanged from the old storefront): the slide moves on
 * every 7 seconds, and the clock does not exist at all under reduced motion,
 * while the pointer is over the carousel, while focus is inside it, while a
 * finger or mouse button is held on it, or while the tab is hidden. Any
 * manual move restarts the full 7 seconds. The progress line is drawn only
 * while the clock really runs — a filling bar over a stopped timer would lie.
 */
const ADVANCE_MS = 7000;

export function StoreHero() {
  const { t, language } = useLanguage();
  const h = useSection(homeText);
  const total = HERO_ROTATION.length;

  // The bar stays clear over the hero until the page scrolls (shell rule).
  useTopBarOverHero();

  const [index, setIndex] = React.useState(0);
  // Pause inputs are tracked separately so any one of them can lift without
  // clobbering the others (a hover ending must not resume a focused carousel).
  const [hoverPaused, setHoverPaused] = React.useState(false);
  const [focusPaused, setFocusPaused] = React.useState(false);
  const [pointerHeld, setPointerHeld] = React.useState(false);
  const [docHidden, setDocHidden] = React.useState(false);
  const reducedMotion = useReducedMotion();
  const pointerStartX = React.useRef<number | null>(null);

  const goTo = React.useCallback(
    (next: number) => setIndex(((next % total) + total) % total),
    [total],
  );

  React.useEffect(() => {
    const update = () => setDocHidden(document.visibilityState === "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const running = !reducedMotion && !hoverPaused && !focusPaused && !pointerHeld && !docHidden;

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % total), ADVANCE_MS);
    // `index` in the deps is the manual-nav reset: any navigation tears the
    // interval down and grants the new slide its full seven seconds.
    return () => window.clearInterval(id);
  }, [running, index, total]);

  const game = HERO_ROTATION[index];
  const slideLabel = t.home.store.hero.slideLabel(index + 1, total);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t.home.store.hero.regionLabel}
      className="under-bar"
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
        // Focus moving BETWEEN controls inside the carousel keeps it
        // paused; only focus leaving the region restarts the clock.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusPaused(false);
      }}
    >
      {/* The spoken update. ONE region that stays mounted (a region rebuilt on
          every slide is often missed by screen readers); only its words change.
          Polite only while the clock is stopped — the visitor is hovering,
          focused or holding — so an auto-rotating hero never talks over the
          page (WAI carousel pattern). */}
      <p aria-live={running ? "off" : "polite"} aria-atomic="true" className="sr-only">
        {h.heroAnnounce(slideLabel, game.title)}
      </p>
      <div className="relative isolate h-[clamp(600px,56vw,820px)] overflow-hidden bg-ground">
        <div
          role="group"
          aria-roledescription="slide"
          aria-label={slideLabel}
          className="absolute inset-0"
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
          // A mouse gets no implicit pointer capture: press, drag off, release
          // outside, and pointerup never fires here — leaving counts as release
          // so the auto-advance can never latch off for the rest of the visit.
          onPointerLeave={() => setPointerHeld(false)}
          onPointerCancel={() => {
            pointerStartX.current = null;
            setPointerHeld(false);
          }}
        >
          <div key={`art-${game.id}`} aria-hidden className="mq-settle absolute inset-0" style={{ backgroundColor: gameArtBg(game) }}>
            <GameArt game={game} variant="hero" />
          </div>
          <div aria-hidden className="absolute inset-0" style={{ background: "var(--mq-scrim-left)" }} />
          <div aria-hidden className="absolute inset-x-0 top-0 h-[220px]" style={{ background: "var(--mq-scrim-top)" }} />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[46%]" style={{ background: "var(--mq-scrim-bottom)" }} />

          <div
            key={`copy-${game.id}`}
            className="mq-rise absolute bottom-[clamp(40px,5vw,80px)] left-gutter right-[45%] max-w-[640px] max-desk:right-gutter"
          >
            <div className="flex min-h-6 flex-wrap items-center gap-2">
              {game.badge !== null && <StoreBadge kind={game.badge} />}
              {game.playersOnline !== null && (
                <StoreBadge kind="online">{formatCompactNumber(game.playersOnline)}</StoreBadge>
              )}
            </div>
            <p className="mt-4 text-sm leading-5 font-extrabold text-link">{t.home.store.hero.kicker}</p>
            {/* The page's one h1. */}
            <h1 className="mt-1.5 text-display text-fg text-balance" style={headingLeading(language, "display")}>
              {game.title}
            </h1>
            <p
              className="mt-3.5 line-clamp-3 max-w-[52ch] text-[17px] leading-[27px] text-fg-body max-desk:line-clamp-2 max-desk:text-[15px] max-desk:leading-6"
              style={headingLeading(language, "deck")}
            >
              {t.home.store.gameCopy[game.descriptionKey]}
            </p>
            <p className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] leading-[22px] text-fg-body">
              <span className="nums">{game.releaseYear}</span>
              <Dot />
              <span>{game.platforms.join(" · ")}</span>
              {game.rating !== null && (
                <>
                  <Dot />
                  <Rating value={game.rating} size="lg" />
                </>
              )}
              <Dot />
              <span>{game.genre}</span>
            </p>
            <p className="mt-1 text-sm leading-5 text-fg-faint">{t.home.store.hero.byStudio(game.studio)}</p>
            <div className="mt-[26px] flex flex-wrap gap-3">
              <Link
                href={GAME_HREF}
                aria-label={h.exploreTitle(game.title)}
                className={buttonVariants({ variant: "play", size: "hero" })}
              >
                <PlayIcon />
                {t.home.store.hero.explore}
              </Link>
              <Link href="#store-featured" className={buttonVariants({ variant: "tonal", size: "hero", className: "px-[22px] text-base" })}>
                <GridComfortableIcon />
                {t.home.store.hero.allGames}
              </Link>
            </div>
          </div>
        </div>

        {/* From 1200px: counter, prev / next and the thumbnail strip. */}
        <div className="absolute right-gutter bottom-[clamp(40px,5vw,80px)] z-10 hidden flex-col items-end gap-3.5 min-[1200px]:flex">
          <div className="flex items-center gap-2">
            <span aria-hidden className="mr-1.5 text-sm leading-5 font-bold text-fg-muted nums">
              {slideLabel}
            </span>
            <HeroArrow label={t.home.store.hero.prev} onClick={() => goTo(index - 1)} tonal>
              <ChevronLeftIcon size={18} strokeWidth={2} />
            </HeroArrow>
            <HeroArrow label={t.home.store.hero.next} onClick={() => goTo(index + 1)} tonal>
              <ChevronRightIcon size={18} strokeWidth={2} />
            </HeroArrow>
          </div>
          <div className="flex items-end gap-2">
            {HERO_ROTATION.map((g, i) => {
              const on = i === index;
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-label={t.home.store.hero.goTo(g.title)}
                  aria-current={on}
                  onClick={() => goTo(i)}
                  className={cn(
                    "relative block aspect-video cursor-pointer overflow-hidden rounded-[8px] border-0 p-0 transition-[opacity,width] duration-200",
                    on
                      ? "w-[104px] opacity-100 shadow-[0_0_0_2px_var(--mq-crimson)]"
                      : "w-[88px] opacity-60 shadow-[inset_0_0_0_1px_var(--mq-hairline-strong)] hover:opacity-100",
                  )}
                  style={{ backgroundColor: gameArtBg(g) }}
                >
                  <GameArt game={g} variant="landscape" />
                  {on && running && (
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
                      <span
                        key={`fill-${index}`}
                        className="block h-[3px] bg-crimson"
                        style={{
                          animationName: "mq-fill",
                          animationDuration: `${ADVANCE_MS}ms`,
                          animationTimingFunction: "linear",
                          animationFillMode: "both",
                        }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Under 1200px: the app's prev / dots / next row. */}
      <div className="mt-1 flex h-11 items-center justify-center min-[1200px]:hidden">
        <HeroArrow label={t.home.store.hero.prev} onClick={() => goTo(index - 1)}>
          <ChevronLeftIcon size={20} strokeWidth={2.2} />
        </HeroArrow>
        {HERO_ROTATION.map((g, i) => (
          <button
            key={g.id}
            type="button"
            aria-label={t.home.store.hero.goTo(g.title)}
            aria-current={i === index}
            onClick={() => goTo(i)}
            className="flex h-11 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0"
          >
            <span
              aria-hidden
              className={cn(
                "block h-1.5 rounded-[3px] transition-[width] duration-200",
                i === index ? "w-[22px] bg-crimson" : "w-1.5 bg-white/30",
              )}
            />
          </button>
        ))}
        <HeroArrow label={t.home.store.hero.next} onClick={() => goTo(index + 1)}>
          <ChevronRightIcon size={20} strokeWidth={2.2} />
        </HeroArrow>
      </div>
    </section>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-fg-decor">
      ·
    </span>
  );
}

/** Prev / next: a 40px tonal disc on the art, or a 44px bare target under it. */
function HeroArrow({
  label,
  onClick,
  tonal = false,
  children,
}: {
  label: string;
  onClick: () => void;
  tonal?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-full border-0 transition-colors duration-150",
        tonal ? "size-10 bg-tonal text-fg hover:bg-tonal-hover" : "size-11 bg-transparent text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
