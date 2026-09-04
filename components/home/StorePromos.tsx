"use client";

import Image from "next/image";
import Link from "next/link";
import type * as React from "react";

import { RevealSection } from "@/components/home/RevealSection";
import { StoreBadge } from "@/components/home/StoreBadge";
import { StorePrice } from "@/components/home/StorePrice";
import { StoreHeading, StoreSection } from "@/components/home/StoreSection";
import { Kicker } from "@/components/system/Kicker";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { formatCompactNumber } from "@/lib/format";
import { GAME_HREF, PROMOS } from "@/lib/home/store";
import { headingLeading, kickerTracking, SLUG } from "@/lib/home/type";
import type { Game } from "@/types/game";

/**
 * THE SPOTLIGHTS — three promotional spreads in three deliberately DIFFERENT
 * layouts, so the section reads as editorial merchandising rather than a
 * grid of ads: a full-bleed band (New Release), a split panel (Coming Soon),
 * and a duo (Free-to-Play + Limited-Time Event).
 *
 * The cast is DERIVED in lib/home/store.ts, not curated here: give a game the
 * right badge and a banner re-aims itself without a component change.
 *
 * By the honesty rule there is no countdown, no "ends in", no ticking
 * anything — this is mock data, and a clock on it would manufacture scarcity
 * the shelf cannot honour. The Coming Soon panel goes further and carries no
 * CTA at all: a banner for an unreleased game has nothing real to link to.
 */

/**
 * The one readability scrim this page allows over artwork — background token
 * family, bottom-up. Shared by the band and both duo plates so every promo
 * fades into the same page, not three different nights.
 */
const BOTTOM_SCRIM = "absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent";

export function StorePromos() {
  const { t, language } = useLanguage();
  const { newRelease, comingSoon, freeToPlay, limitedEvent } = PROMOS;

  return (
    <RevealSection>
      <StoreSection as="div" pad="standard">
        <StoreHeading kicker={t.home.store.promos.kicker} title={t.home.store.promos.title} />

        {/* ── Banner A · New Release — the full-bleed band ─────────────────
            The artwork IS the banner: one 21:9 stage (4:3 on a phone, where
            21:9 leaves no room for copy), scrimmed like the hero, with the
            copy block anchored bottom-left. The only promo with a CTA — the
            one game here you can actually go and get. */}
        <div className="group relative mt-6 overflow-hidden rounded-lg ring-1 ring-white/10 ring-inset lg:rounded-xl">
          <div className="relative aspect-[4/3] sm:aspect-[21/9]">
            <Image
              fill
              src={newRelease.heroArtworkUrl}
              alt=""
              sizes="(min-width:1024px) min(100vw - 72px, 1536px), 100vw"
              className="object-cover transition-transform duration-700 ease-aurora group-hover:scale-[1.04]"
            />
            <div aria-hidden className={BOTTOM_SCRIM} />
            {/* The left scrim earns its keep only where the copy block hugs
                the left half; below lg the copy spans the full width and the
                bottom scrim already carries it. */}
            <div
              aria-hidden
              className="absolute inset-0 hidden bg-gradient-to-r from-background/85 via-background/30 to-transparent lg:block"
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:max-w-[50%]">
            <div className="flex items-center gap-2.5">
              <StoreBadge kind="new" />
              <Kicker tone="primary" style={kickerTracking(language)}>
                {t.home.store.promos.newRelease}
              </Kicker>
            </div>
            <h3 className="text-title mt-2" style={headingLeading(language, "title")}>
              {newRelease.title}
            </h3>
            {/* The hero's quiet cut, not DECK — this line sits on artwork
                under a title, and text-lg there shouts. */}
            <p
              className="mt-2 line-clamp-2 text-sm text-foreground/75 sm:text-base"
              style={headingLeading(language, "deck")}
            >
              {t.home.store.gameCopy[newRelease.descriptionKey]}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <StorePrice priceMMK={newRelease.priceMMK} />
              <Button
                variant="onArt"
                size="pill-sm"
                render={<Link href={GAME_HREF} />}
                nativeButton={false}
              >
                {t.home.store.hero.explore}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Banner B · Coming Soon — the split panel ─────────────────────
            Text on glass beside desaturated artwork: a game that is not out
            yet gets a calmer plate than one you can play tonight. NO CTA and
            NO countdown by design — the panel promises a year, in words,
            and nothing else. */}
        <RevealSection as="div" delay={0.08}>
          <div className="mt-4 grid overflow-hidden rounded-lg ring-1 ring-white/10 ring-inset sm:mt-6 lg:grid-cols-[5fr_7fr]">
            {/* Art first in the DOM so a phone reads art-over-text like the
                other banners; from lg the text plate orders itself first so
                the two text blocks (A's and B's) sit on the same left edge. */}
            <div className="relative aspect-video lg:order-last lg:aspect-auto lg:min-h-[340px]">
              <Image
                fill
                src={comingSoon.heroArtworkUrl}
                alt=""
                sizes="(min-width:1024px) 60vw, 100vw"
                className="object-cover saturate-75"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent lg:bg-gradient-to-r lg:from-card/70 lg:via-transparent lg:to-transparent"
              />
            </div>

            <div className="flex flex-col justify-center gap-3 bg-card/60 p-6 backdrop-blur-xl sm:p-10">
              <StoreBadge kind="comingSoon" className="self-start" />
              <h3 className="text-title" style={headingLeading(language, "title")}>
                {comingSoon.title}
              </h3>
              <p
                className="text-sm text-foreground/75 sm:text-base"
                style={headingLeading(language, "deck")}
              >
                {t.home.store.gameCopy[comingSoon.descriptionKey]}
              </p>
              {/* Sans, not SLUG: `expected()` is a whole translated sentence
                  and mm's reads in Burmese — Geist Mono has no Myanmar glyphs,
                  so the mono voice would blank it for the default language.
                  `nums` keeps the year's digits tabular either way. */}
              <p className="nums text-xs font-medium text-muted-foreground">
                {t.home.store.promos.expected(comingSoon.releaseYear)}
              </p>
            </div>
          </div>
        </RevealSection>

        {/* ── Banner C · the duo — Free-to-Play + Limited-Time Event ───────
            Two half-width plates, whole-plate links like the game cards.
            Different pitches, same frame: the free plate leads with its
            price-that-isn't, the event plate with its premium clock-free
            "happening now". */}
        <RevealSection as="div" delay={0.16}>
          <div className="mt-4 grid gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-6">
            <DuoPlate game={freeToPlay}>
              <Kicker tone="success" style={kickerTracking(language)}>
                {t.home.store.promos.freeToPlay}
              </Kicker>
              <h3 className="text-section-title mt-1.5" style={headingLeading(language, "title")}>
                {freeToPlay.title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <StorePrice priceMMK={freeToPlay.priceMMK} />
                {freeToPlay.playersOnline !== null && (
                  <span className="flex items-baseline gap-1.5">
                    {/* Figure in mono, word in sans — the storefront-wide split. */}
                    <span className={SLUG}>{formatCompactNumber(freeToPlay.playersOnline)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.home.store.live.playing}
                    </span>
                  </span>
                )}
              </div>
            </DuoPlate>

            <DuoPlate game={limitedEvent}>
              <Kicker tone="premium" style={kickerTracking(language)}>
                {t.home.store.promos.limitedEvent}
              </Kicker>
              <h3 className="text-section-title mt-1.5" style={headingLeading(language, "title")}>
                {limitedEvent.title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {limitedEvent.eventKey !== null && (
                  <span className="text-xs text-premium">
                    {t.home.store.events[limitedEvent.eventKey]}
                  </span>
                )}
                <StoreBadge kind="limited" size="sm" />
              </div>
            </DuoPlate>
          </div>
        </RevealSection>
      </StoreSection>
    </RevealSection>
  );
}

/**
 * One half of the duo: a 16:10 artwork plate that is one whole <Link>, with
 * the caller's copy laid over the shared bottom scrim. 16:10, not 16:9, on
 * purpose — a hair more height than the game cards keeps the duo reading as
 * promos rather than as two more shelf items.
 */
function DuoPlate({ game, children }: { game: Game; children: React.ReactNode }) {
  return (
    <Link
      href={GAME_HREF}
      className="group relative block aspect-[16/10] overflow-hidden rounded-lg ring-1 ring-white/10 ring-inset outline-none transition duration-300 hover:ring-white/20 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Image
        fill
        src={game.artworkUrl}
        alt=""
        sizes="(min-width:640px) 50vw, 100vw"
        className="object-cover transition-transform duration-700 ease-aurora group-hover:scale-[1.04]"
      />
      <div aria-hidden className={BOTTOM_SCRIM} />
      <div className="absolute inset-x-0 bottom-0 p-5">{children}</div>
    </Link>
  );
}
