"use client";

import Link from "next/link";
import type * as React from "react";

import { GameArt, gameArtBg } from "@/components/home/arcade/GameArt";
import { StoreBadge } from "@/components/home/arcade/StoreBadge";
import { priceWords } from "@/components/home/arcade/StorePrice";
import { StoreHeading, StoreSection } from "@/components/home/arcade/StoreSection";
import { PlayIcon } from "@/components/system/icons";
import { buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { formatCompactNumber } from "@/lib/format";
import { GAME_HREF, PROMOS } from "@/lib/home/store";
import { headingLeading } from "@/lib/home/type";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

/**
 * HAPPENING ON MYANFLIX (Main.dc.html §4) — three spotlights in three
 * deliberately different layouts:
 *
 *   A · New release — a 21:8 art band (4:5 on phones), the whole band one
 *       link, with a white "Explore game" drawn inside it and the price.
 *   B · Coming soon — a split panel: words on the surface colour, faded art
 *       beside them (art on top on phones). NO button and NO countdown: an
 *       unreleased game has nothing real to link to, only a year.
 *   C · The duo — Free to play and Limited-time event, two 16:10 art cards.
 *
 * The casts are DERIVED in lib/home/store.ts (PROMOS), not picked here, and
 * nothing ticks: the figures are static by the honesty rule.
 */

/** The duo's bottom scrim (70% tall, ground colour at 0 → 85% → 95%). */
const DUO_SCRIM =
  "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--mq-ground) 85%, transparent) 60%, color-mix(in srgb, var(--mq-ground) 95%, transparent) 100%)";

/** The band's bottom scrim (60% tall, ground colour at 0 → 80%), exactly the board's. */
const BAND_SCRIM = "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--mq-ground) 80%, transparent) 100%)";

export function StorePromos() {
  const { t, language } = useLanguage();
  const h = useSection(homeText);
  const { newRelease, comingSoon, freeToPlay, limitedEvent } = PROMOS;

  const freeCount = freeToPlay.playersOnline !== null ? formatCompactNumber(freeToPlay.playersOnline) : null;
  const eventName = limitedEvent.eventKey !== null ? t.home.store.events[limitedEvent.eventKey] : null;

  return (
    <StoreSection headingId="h-spot">
      <StoreHeading id="h-spot" eyebrow={t.home.store.promos.kicker} title={t.home.store.promos.title} />

      {/* A · New release band */}
      <Link
        href={GAME_HREF}
        aria-label={h.bandLabel(
          newRelease.title,
          priceWords(newRelease.priceMMK, newRelease.badge === "comingSoon", t.home.store.price.free),
        )}
        className="group/card relative mt-5 block aspect-[21/8] overflow-hidden rounded-landscape max-desk:aspect-[4/5]"
        style={{ backgroundColor: gameArtBg(newRelease) }}
      >
        <GameArt game={newRelease} variant="hero" zoom />
        <span aria-hidden className="absolute inset-0" style={{ background: "var(--mq-scrim-left)" }} />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[60%]" style={{ background: BAND_SCRIM }} />
        {/* Divs where a real h3 title sits (heading-by-heading navigation). */}
        <div className="absolute bottom-[clamp(16px,3vw,40px)] left-[clamp(16px,3vw,44px)] flex max-w-[520px] flex-col max-desk:right-[clamp(16px,4vw,24px)] max-desk:max-w-none">
          <span className="flex items-center gap-2.5">
            <StoreBadge kind="new" />
            <span className="text-sm leading-5 font-extrabold text-link">{t.home.store.promos.newRelease}</span>
          </span>
          <h3
            className="mt-3 text-title text-fg transition-colors duration-150 group-hover/card:text-link"
            style={headingLeading(language, "title")}
          >
            {newRelease.title}
          </h3>
          <span
            className="mt-2 line-clamp-2 text-base leading-[25px] text-fg-body"
            style={headingLeading(language, "deck")}
          >
            {t.home.store.gameCopy[newRelease.descriptionKey]}
          </span>
          <span className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className={buttonVariants({ variant: "play", size: "cta", className: "px-[22px]" })}>
              <PlayIcon size={18} />
              {t.home.store.hero.explore}
            </span>
            {newRelease.priceMMK !== null && (
              <span className="text-lg leading-6 font-extrabold text-fg nums">
                {priceWords(newRelease.priceMMK, false, t.home.store.price.free)}
              </span>
            )}
          </span>
        </div>
      </Link>

      {/* B · Coming soon split panel (no button, no countdown) */}
      <div className="mq-stack mt-6 grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] overflow-hidden rounded-landscape bg-surface">
        <div className="flex flex-col justify-center p-[clamp(24px,3vw,48px)]">
          <span className="flex">
            <StoreBadge kind="comingSoon" surface="tint" />
          </span>
          <h3
            className="mt-3.5 text-[clamp(26px,2.4vw,34px)] leading-[1.15] font-black tracking-[-0.03em] text-fg"
            style={headingLeading(language, "title")}
          >
            {comingSoon.title}
          </h3>
          <p className="mt-2 max-w-[46ch] text-base leading-[25px] text-fg-muted" style={headingLeading(language, "deck")}>
            {t.home.store.gameCopy[comingSoon.descriptionKey]}
          </p>
          <p className="mt-3 text-sm leading-5 font-bold text-fg-body nums">
            {t.home.store.promos.expected(comingSoon.releaseYear)}
          </p>
        </div>
        <div
          className="relative min-h-[340px] max-desk:order-first max-desk:min-h-[200px]"
          style={{ backgroundColor: gameArtBg(comingSoon) }}
        >
          <GameArt game={comingSoon} variant="landscape" stars className="opacity-55" />
          <span
            aria-hidden
            className="absolute bottom-[clamp(14px,2vw,24px)] left-[clamp(16px,2vw,28px)] text-[clamp(22px,2.4vw,34px)] leading-[1.04] font-black tracking-[-0.02em] text-white/72 uppercase"
          >
            {comingSoon.title}
          </span>
        </div>
      </div>

      {/* C · The duo */}
      <div className="mq-stack mt-6 grid grid-cols-2 gap-6">
        <DuoCard game={freeToPlay} label={h.freeCard(freeToPlay.title, freeCount)}>
          <span className="text-sm leading-5 font-extrabold text-money">{t.home.store.promos.freeToPlay}</span>
          <DuoTitle>{freeToPlay.title}</DuoTitle>
          <span className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex h-6 items-center rounded-badge bg-money/16 px-2 text-[12px] leading-4 font-extrabold text-money">
              {t.home.store.price.free}
            </span>
            {freeCount !== null && (
              <span className="text-sm leading-5 text-fg-body">
                <span className="font-extrabold text-fg nums">{freeCount}</span> {t.home.store.live.playing}
              </span>
            )}
          </span>
        </DuoCard>

        <DuoCard game={limitedEvent} label={h.eventCard(limitedEvent.title, eventName)}>
          <span className="text-sm leading-5 font-extrabold text-gold">{t.home.store.promos.limitedEvent}</span>
          <DuoTitle>{limitedEvent.title}</DuoTitle>
          <span className="mt-2.5 flex flex-wrap items-center gap-2.5">
            {eventName !== null && <span className="text-sm leading-5 font-bold text-gold">{eventName}</span>}
            <StoreBadge kind="limited" surface="tint" />
          </span>
        </DuoCard>
      </div>
    </StoreSection>
  );
}

function DuoTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-1 text-[clamp(24px,2vw,30px)] leading-[1.15] font-black tracking-[-0.02em] text-fg transition-colors duration-150 group-hover/card:text-link">
      {children}
    </h3>
  );
}

/** One half of the duo: a 16:10 art card that is one whole link. */
function DuoCard({ game, label, children }: { game: Game; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={GAME_HREF}
      aria-label={label}
      className={cn("group/card relative block aspect-[16/10] min-w-0 overflow-hidden rounded-landscape")}
      style={{ backgroundColor: gameArtBg(game) }}
    >
      <GameArt game={game} variant="landscape" halo="wide" zoom />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[70%]" style={{ background: DUO_SCRIM }} />
      <div className="absolute inset-x-[clamp(16px,2vw,28px)] bottom-[clamp(16px,2vw,26px)] flex flex-col">
        {children}
      </div>
    </Link>
  );
}
