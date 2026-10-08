"use client";

import Link from "next/link";

import { BookIcon, FilmIcon, TvIcon } from "@/components/home/arcade/HomeIcons";
import { StoreHeading, StoreSection } from "@/components/home/arcade/StoreSection";
import { MEDIA_CHIP_HREF } from "@/components/layout/MediaChipStrip";
import { FallbackArt } from "@/components/system/FallbackArt";
import { ChevronRightIcon, LockIcon } from "@/components/system/icons";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { headingLeading } from "@/lib/home/type";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { cn } from "@/lib/utils";

/**
 * WATCH ON MYANFLIX (Main.dc.html §3) — the hand-off lane from the games
 * storefront into Media: three wide art tiles, Movies · Series · Books, each
 * with a fan of three covers, a crimson icon, the name, one line about what
 * is inside and a crimson "Browse …" link. "Open Media" sits in the header.
 *
 * ZERO catalogue requests, like the rest of Home: the covers are the
 * foundation's local placeholder scenes and the line under each name
 * describes the shelf in words — the page never fetches real titles.
 *
 * Links go where the Media chip strip goes (MEDIA_CHIP_HREF): Movies →
 * /media, Series → /media/movies?tab=series, Books → /media/books. Books
 * still need an account (the /books endpoints refuse guests), so for a
 * guest the Books tile goes through /login?next=/media/books and says
 * "Sign in to read" with a lock instead of the crimson link.
 */
type WatchKey = "movies" | "series" | "books";

interface WatchTileData {
  key: WatchKey;
  name: string;
  line: string;
  cta: string;
  href: string;
  icon: typeof FilmIcon;
  locked: boolean;
}

/** Tile scenery from the board — artwork colours, not UI tokens. */
const TILE_ART: Record<WatchKey, { bg: string; glow: string; dark: string }> = {
  movies: { bg: "#1B2A3A", glow: "#E8A33D", dark: "#0B1520" },
  series: { bg: "#14262B", glow: "#7FD6C2", dark: "#081316" },
  books: { bg: "#2A2416", glow: "#F2C66B", dark: "#120F07" },
};

const FAN = [
  { right: "4%", top: "12%", opacity: 1, z: 3 },
  { right: "15%", top: "18%", opacity: 0.9, z: 2 },
  { right: "26%", top: "24%", opacity: 0.8, z: 1 },
] as const;

export function StoreWatch() {
  const { isAuthenticated } = useAuth();
  const h = useSection(homeText);
  const booksLocked = !isAuthenticated;

  const tiles: WatchTileData[] = [
    { key: "movies", name: h.movies, line: h.moviesLine, cta: h.browseMovies, href: MEDIA_CHIP_HREF.movies, icon: FilmIcon, locked: false },
    { key: "series", name: h.series, line: h.seriesLine, cta: h.browseSeries, href: MEDIA_CHIP_HREF.series, icon: TvIcon, locked: false },
    {
      key: "books",
      name: h.books,
      line: h.booksLine,
      cta: booksLocked ? h.signInToRead : h.browseBooks,
      href: booksLocked ? loginHref(MEDIA_CHIP_HREF.books) : MEDIA_CHIP_HREF.books,
      icon: BookIcon,
      locked: booksLocked,
    },
  ];

  return (
    <StoreSection headingId="h-watch">
      <StoreHeading
        id="h-watch"
        eyebrow={h.watchKicker}
        title={h.watchTitle}
        action={
          <Link href="/media" className="mq-link rounded-[6px] text-[15px] leading-5 font-bold">
            {h.openMedia}
          </Link>
        }
      />
      <div className="mq-stack mt-5 grid grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <WatchTile key={tile.key} tile={tile} />
        ))}
      </div>
    </StoreSection>
  );
}

function WatchTile({ tile }: { tile: WatchTileData }) {
  const { language } = useLanguage();
  const h = useSection(homeText);
  const art = TILE_ART[tile.key];
  const Icon = tile.icon;
  const book = tile.key === "books";

  return (
    <Link
      href={tile.href}
      aria-label={h.watchCard(tile.name, tile.line, tile.cta)}
      className="group/card relative block aspect-video min-w-0 overflow-hidden rounded-landscape max-desk:aspect-[16/10]"
      style={{ backgroundColor: art.bg }}
    >
      <svg
        aria-hidden
        focusable={false}
        className="absolute inset-0 size-full"
        viewBox="0 0 240 135"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="240" height="135" fill={art.bg} />
        <circle cx="190" cy="34" r="44" fill={art.glow} opacity="0.14" />
        <path d="M0 112 C60 104 120 108 180 100 C206 96 226 98 240 96 V135 H0 Z" fill={art.dark} />
      </svg>

      {/* The fan of three covers on the right (placeholder scenes). */}
      <span
        aria-hidden
        className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/card:scale-[1.04]"
      >
        {FAN.map((f, k) => (
          <span
            key={k}
            className={cn(
              "absolute overflow-hidden",
              book ? "aspect-[5/7] w-[21%] rounded-[2px_8px_8px_2px]" : "aspect-[2/3] w-[22%] rounded-[8px]",
            )}
            style={{ right: f.right, top: f.top, opacity: f.opacity, zIndex: f.z }}
          >
            <FallbackArt seed={`watch-${tile.key}-${k}`} variant={book ? "book" : "poster"} />
          </span>
        ))}
      </span>

      <span aria-hidden className="absolute inset-0" style={{ background: "var(--mq-scrim-left)" }} />

      {/* Divs so the name can be a real h3, like every other card title on Home. */}
      <div className="absolute bottom-[clamp(16px,1.6vw,22px)] left-[clamp(16px,1.6vw,22px)] flex w-[44%] flex-col max-desk:w-[58%]">
        <div className="flex items-center gap-2">
          <Icon size={22} className="shrink-0 text-link" />
          <h3
            className="text-[clamp(22px,1.9vw,28px)] leading-[1.15] font-black tracking-[-0.02em] text-fg transition-colors duration-150 group-hover/card:text-link"
            style={headingLeading(language, "title")}
          >
            {tile.name}
          </h3>
        </div>
        <span className="mt-1 line-clamp-2 text-sm leading-5 text-fg-body">{tile.line}</span>
        <span
          className={cn(
            "mt-2.5 inline-flex items-center gap-1.5 text-sm leading-5 font-extrabold",
            tile.locked ? "text-fg-body" : "text-link",
          )}
        >
          {tile.locked && <LockIcon size={14} strokeWidth={2} />}
          {tile.cta}
          {!tile.locked && <ChevronRightIcon size={14} strokeWidth={2.2} />}
        </span>
      </div>
    </Link>
  );
}
