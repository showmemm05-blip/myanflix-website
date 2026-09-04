"use client";

import Image from "next/image";
import Link from "next/link";

import { RevealSection } from "@/components/home/RevealSection";
import { StoreBadge } from "@/components/home/StoreBadge";
import { StoreSection } from "@/components/home/StoreSection";
import { Kicker } from "@/components/system/Kicker";
import { useLanguage } from "@/lib/context/language-context";
import { formatCompactNumber } from "@/lib/format";
import { GAME_HREF, LIVE_NOW } from "@/lib/home/store";
import { headingLeading, kickerTracking } from "@/lib/home/type";
import { usePeakUsers } from "@/lib/hooks/use-peak-users";

/**
 * LIVE AND BUSY — the storefront's data-forward band: a narrow heading rail
 * and four dense tiles for every game with a concurrent-player figure.
 *
 * Deliberately the opposite register from Featured: glassy dark plates
 * instead of big artwork, thumbs instead of stages, and the mono voice doing
 * the talking. The only motion is light — the pulse dots (pure CSS
 * animate-ping, frozen to static dots by the global reduced-motion guard) and
 * a hover tint. The player counts are STATIC mock figures by the honesty
 * rule: they render once and never tick, count up, or shimmer.
 *
 * The one genuine live number on the whole page sits in the heading rail —
 * the platform-wide peak-users figure, read through the shared ['peak-users']
 * react-query key (already warmed by the shell; reading here never refires
 * it) and phrased with the existing nav.peakViewers sentence so it is
 * labelled as exactly what it is: viewers, not players.
 */
export function StoreLive() {
  const { t, language } = useLanguage();
  const peak = usePeakUsers();

  return (
    <RevealSection y={20} amount={0.15}>
      <StoreSection as="div" pad="standard">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          {/* Heading rail — stacks above the tiles below lg, sits beside them from lg. */}
          <div>
            {/* The section's own Kicker + h2 (not StoreHeading): the live
                kicker carries a pulse dot that the shared helper has no slot
                for. The Burmese inline fixes are applied the same way. */}
            <Kicker className="flex items-center gap-2" style={kickerTracking(language)}>
              <span aria-hidden className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-destructive" />
              </span>
              {t.home.store.live.kicker}
            </Kicker>
            <h2 className="text-section-title mt-1.5" style={headingLeading(language, "title")}>
              {t.home.store.live.title}
            </h2>
            {peak !== null && (
              // Whole translated sentence around a formatted figure — never
              // fragments glued together. usePeakUsers returns null while
              // loading or when the number wouldn't impress; no skeleton.
              <p className="text-body-muted mt-3">
                {t.nav.peakViewers(peak.toLocaleString("en-US"))}
              </p>
            )}
          </div>

          {/* Four dense tiles, busiest first. Each is ONE link named by its
              game title; everything else inside is presentational. */}
          <div className="grid gap-3 sm:grid-cols-2">
            {LIVE_NOW.map((game) => (
              <Link
                key={game.id}
                href={GAME_HREF}
                className="group relative flex items-center gap-4 overflow-hidden rounded-lg bg-card/60 p-3 ring-1 ring-white/8 ring-inset backdrop-blur-xl transition-colors duration-300 outline-none hover:bg-card/80 hover:ring-white/16 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md sm:w-28">
                  {/* Decorative — the adjacent title names the game. */}
                  <Image
                    fill
                    src={game.artworkUrl}
                    alt=""
                    sizes="112px"
                    className="object-cover transition-transform duration-500 ease-aurora group-hover:scale-[1.06]"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{game.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StoreBadge kind="live" size="sm" />
                    {/* Figure in mono, word in sans — the storefront-wide
                        split (Geist Mono has no Myanmar glyphs). Static by
                        the honesty rule; a screen reader hears "12.4K
                        playing" as plain text. */}
                    {game.playersOnline !== null && (
                      <span className="nums font-mono text-xs text-foreground/85">
                        {formatCompactNumber(game.playersOnline)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {t.home.store.live.playing}
                    </span>
                  </div>
                  {game.eventKey !== null && (
                    <p className="mt-0.5 text-[11px] text-premium">
                      {t.home.store.live.eventLive} · {t.home.store.events[game.eventKey]}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </StoreSection>
    </RevealSection>
  );
}
