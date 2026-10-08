"use client";

import Link from "next/link";

import { GameArt, gameArtBg } from "@/components/home/arcade/GameArt";
import { StoreBadge } from "@/components/home/arcade/StoreBadge";
import { priceWords, StorePrice } from "@/components/home/arcade/StorePrice";
import { StarIcon } from "@/components/system/icons";
import { useLanguage } from "@/lib/context/language-context";
import { GAME_HREF } from "@/lib/home/store";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

/**
 * THE GAME CARD — two cuts from Main.dc.html.
 *
 * `featured` — the shelf card: a 16:9 art plate with the title set into the
 * art and the status badge top-left, then one line underneath (title ·
 * genre · platforms · rating) with the price on the right.
 *
 * `discover` — the rail poster: 2:3 art (rail width clamp(128px, 12.2vw,
 * 184px)) with the title set in, a crimson NEW ribbon or a status badge,
 * then title, "genre · year" and the price.
 *
 * Both are ONE link to the games destination (GAME_HREF), named by a whole
 * sentence; nothing inside is interactive. The visible title is a real h3
 * (as in the old storefront) so screen readers can jump card to card. Hover: the art zooms 1.04 and the
 * title turns crimson.
 */
export function StoreGameCard({
  game,
  size,
  className,
}: {
  game: Game;
  size: "featured" | "discover";
  className?: string;
}) {
  const { t } = useLanguage();
  const h = useSection(homeText);
  const s = useSection(shellText);
  const unreleased = game.badge === "comingSoon";
  const price = priceWords(game.priceMMK, unreleased, t.home.store.price.free);
  const platforms = game.platforms.join(" · ");

  if (size === "discover") {
    const status = game.badge ? t.home.store.badge[game.badge] : "";
    return (
      <Link
        href={GAME_HREF}
        aria-label={h.discoverCard(game.title, game.genre, game.releaseYear, status, price)}
        className={cn("group/card mq-snap relative block w-[clamp(128px,12.2vw,184px)] shrink-0 rounded-card", className)}
      >
        <span
          className="relative block aspect-[2/3] overflow-hidden rounded-card"
          style={{ backgroundColor: gameArtBg(game) }}
        >
          <GameArt game={game} variant="poster" shade zoom />
          <span
            aria-hidden
            className="absolute inset-x-2.5 bottom-3 text-sm leading-[15px] font-black tracking-[-0.02em] text-white uppercase"
          >
            {game.title}
          </span>
          {game.badge === "new" && (
            <span className="absolute top-2.5 left-0 h-5 rounded-r-[4px] bg-crimson px-[7px] text-[10px] leading-5 font-extrabold tracking-[0.06em] text-white [&:lang(my)]:tracking-normal">
              {s.newTag}
            </span>
          )}
          {game.badge !== null && game.badge !== "new" && (
            <StoreBadge kind={game.badge} className="absolute top-2 left-2" />
          )}
        </span>
        <h3 className="mt-2.5 block truncate text-card-title text-fg transition-colors duration-150 group-hover/card:text-link">
          {game.title}
        </h3>
        <span className="block text-caption whitespace-nowrap text-fg-faint nums">
          {game.genre} · {game.releaseYear}
        </span>
        <span className="mt-0.5 block min-h-5">
          <StorePrice priceMMK={game.priceMMK} unreleased={unreleased} size="sm" />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={GAME_HREF}
      aria-label={h.featuredCard(game.title, game.genre, platforms, game.rating?.toFixed(1) ?? null, price)}
      className={cn("group/card block min-w-0 rounded-landscape", className)}
    >
      <span
        className="relative block aspect-video overflow-hidden rounded-landscape"
        style={{ backgroundColor: gameArtBg(game) }}
      >
        <GameArt game={game} variant="landscape" halo shade zoom />
        <span
          aria-hidden
          className="absolute inset-x-[clamp(14px,1.6vw,24px)] bottom-[clamp(13px,1.5vw,22px)] text-[clamp(22px,2.5vw,36px)] leading-[1.04] font-black tracking-[-0.02em] text-white uppercase"
        >
          {game.title}
        </span>
        {game.badge !== null && <StoreBadge kind={game.badge} className="absolute top-3 left-3" />}
      </span>
      {/* Divs, not spans: the title is a real h3 (heading-by-heading navigation). */}
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-fg-muted">
          <h3 className="text-base font-extrabold text-fg transition-colors duration-150 group-hover/card:text-link">
            {game.title}
          </h3>
          <Dot />
          <span>{game.genre}</span>
          <Dot />
          <span>{platforms}</span>
          {game.rating !== null && (
            <>
              <Dot />
              <span className="inline-flex items-center gap-1 text-fg-body nums">
                <StarIcon size={13} className="text-gold" />
                {game.rating.toFixed(1)}
              </span>
            </>
          )}
        </div>
        <StorePrice priceMMK={game.priceMMK} unreleased={unreleased} />
      </div>
    </Link>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-fg-decor">
      ·
    </span>
  );
}
