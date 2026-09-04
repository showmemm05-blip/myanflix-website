"use client";

import Image from "next/image";
import Link from "next/link";

import { StoreBadge } from "@/components/home/StoreBadge";
import { StorePrice } from "@/components/home/StorePrice";
import { GAME_HREF } from "@/lib/home/store";
import { SLUG } from "@/lib/home/type";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

/**
 * THE GAME PLATE — one card, two cuts.
 *
 * `featured` is the rich shopping card: the 16:9 artwork IS the card, with
 * the title, meta and price laid over a bottom scrim. `discover` is the small
 * rail tile: the artwork is the plate and the words sit quietly beneath it in
 * normal flow, sized and snap-aligned for the scroller.
 *
 * Both are ONE <Link> — the whole plate is clickable and the title names it;
 * badges, meta and price are presentational text inside. No 2:3 posters
 * anywhere on this page: every artwork is a 16:9 frame, by identity.
 *
 * Dumb on purpose: props in, markup out. Entrance motion belongs to the
 * sections (RevealSection); the card owns only its hover.
 */
export function StoreGameCard({
  game,
  size,
  priority = false,
  className,
}: {
  game: Game;
  size: "featured" | "discover";
  /** Above-the-fold featured cards may opt into eager loading. */
  priority?: boolean;
  className?: string;
}) {
  if (size === "discover") {
    return (
      <Link
        href={GAME_HREF}
        className={cn(
          "group relative block w-[180px] shrink-0 snap-start rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[220px]",
          className,
        )}
      >
        {/* The glow overlay must sit OUTSIDE the clipped artwork box:
            glow-primary is a box-shadow that spills past the plate, and an
            overflow-hidden ancestor would swallow it. Hence the extra
            unclipped wrapper. */}
        <div className="relative">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-card ring-1 ring-white/10 ring-inset transition duration-300 group-hover:ring-white/20">
            <Image
              fill
              src={game.artworkUrl}
              alt=""
              sizes="220px"
              className="object-cover transition-transform duration-700 ease-aurora group-hover:scale-[1.04]"
            />
            {game.badge && (
              <StoreBadge kind={game.badge} size="sm" className="absolute left-2 top-2" />
            )}
          </div>
          <span
            aria-hidden
            className="glow-primary pointer-events-none absolute -inset-px rounded-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        </div>
        <h3 className="mt-2 truncate text-sm font-medium">{game.title}</h3>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            {/* genre is a word → sans; the year is a numeral → SLUG. */}
            <span className="truncate">{game.genre}</span>
            <span className={SLUG}>{game.releaseYear}</span>
          </span>
          <StorePrice priceMMK={game.priceMMK} size="sm" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={GAME_HREF}
      className={cn(
        "group relative block rounded-lg bg-card ring-1 ring-white/10 ring-inset outline-none transition duration-300 hover:-translate-y-0.5 hover:ring-white/20 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {/* overflow-hidden lives on the artwork box, not the link root, for the
          same box-shadow reason as above: the hover glow must escape the
          plate. The box carries the root's radius so the zoomed artwork
          still clips to the card's corners. */}
      <div className="relative aspect-video overflow-hidden rounded-lg">
        <Image
          fill
          src={game.artworkUrl}
          alt=""
          priority={priority}
          sizes="(min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-aurora group-hover:scale-[1.05]"
        />
        {/* Readability scrim — background token family only, by identity. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent"
        />
      </div>
      {game.badge && <StoreBadge kind={game.badge} className="absolute left-3 top-3" />}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-section-title">{game.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-xs text-muted-foreground">{game.genre}</span>
            <span className={SLUG}>{game.platforms.join(" · ")}</span>
            {game.rating !== null && (
              <span className={cn(SLUG, "text-premium")}>★ {game.rating.toFixed(1)}</span>
            )}
          </div>
        </div>
        <StorePrice priceMMK={game.priceMMK} />
      </div>
      <span
        aria-hidden
        className="glow-primary pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
    </Link>
  );
}
