"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Play, Plus, Star } from "lucide-react";

import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { BrowseItem } from "@/components/browse/browse-item";
import { AccessBadge } from "./AccessBadge";

/**
 * THE DOSSIER CARD — MyanFlix's title object.
 *
 * A poster wall makes every title shout and none of them speak: tall artwork
 * fills the card, the words hide on a hover, and browsing becomes squinting at
 * a mosaic. This card is built the other way round — it is a *plate* that holds
 * a film, not a poster with decoration.
 *
 * The composition is deliberately asymmetric and layered:
 *
 *   ┌─────────────────────────────┐
 *   │  the still (16:9, cinematic)│  ← the scene: wide, calm, croppable
 *   │                             │
 *   ├──┬──────────────────────────┤
 *   │▓▓│ Title              ★ 8.4 │  ← the spine: poster tile straddles the
 *   │▓▓│ 2026 · 1h 42m · Action   │     seam, metadata reads as a line of type
 *   └──┴──────────────────────────┘
 *
 *  - the STILL is a landscape frame (the backdrop where we have one, the poster
 *    cropped where we don't), so a row of cards reads as a strip of scenes
 *    rather than a fence of spines;
 *  - the POSTER TILE is inset at the seam, overlapping both halves. It is the
 *    signature move: the artwork that identifies a film is still present, but
 *    as an object placed *on* the card instead of the card itself;
 *  - the SPINE carries title, rating and the metadata line as ordinary,
 *    always-legible type on the plate — never white-on-photo, never on hover.
 *
 * Roughly two-thirds picture to one-third information, and wider than it is
 * tall, so a grid of these scans horizontally like a page of entries.
 *
 * Markup: an <article> with a full-card <Link> overlay at z-[1] and the real
 * controls above it at z-[2] — never a button inside an anchor. Behaviour is
 * unchanged from the card it replaces: same BrowseItem shape, same watchlist
 * toggle, same play gating, same hrefs.
 */
export function MediaCard({
  item,
  className,
  sizes = "(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 380px",
  priority = false,
}: {
  item: BrowseItem;
  className?: string;
  /** Passed through to next/image for grids with unusual column counts. */
  sizes?: string;
  /** Above-the-fold cards (the first rail) can opt into eager loading. */
  priority?: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();

  const canPlay = item.playHref !== null && (item.accessType === "FREE" || isSubscribed);
  const saved = item.watchlistId ? isInWatchlist(item.watchlistId) : false;
  const posterSrc = item.posterUrl ?? FALLBACK_POSTER_URL;
  // Backdrops are the intent; a poster cropped to 16:9 is the graceful fallback
  // for a title that has no still yet, and object-cover keeps it centred.
  const stillSrc = item.coverUrl ?? posterSrc;

  return (
    <article
      className={cn(
        "group/card relative isolate flex min-w-0 flex-col rounded-2xl bg-card/55 p-2 ring-1 ring-white/8 shadow-e1 transition-[transform,background-color,box-shadow] duration-200 ease-out ring-inset",
        "group-hover/card:bg-card/75 hover:-translate-y-0.5 hover:bg-card/80 hover:shadow-e3",
        "focus-within:-translate-y-0.5 focus-within:bg-card/80 focus-within:shadow-e3",
        className,
      )}
    >
      {/* ─ The still ─ */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-secondary/60 ring-1 ring-white/8 ring-inset">
        <Image
          src={stillSrc}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.04]"
        />
        {/* Keeps the badge and the tile's shoulder legible over a bright frame. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25"
        />

        <AccessBadge accessType={item.accessType} className="absolute top-2 left-2" />

        {item.watchlistId && (
          <button
            type="button"
            aria-label={saved ? t.browse.inWatchlist : t.browse.addToWatchlist}
            aria-pressed={saved}
            onClick={() => toggleWatchlist(item.watchlistId!)}
            className={cn(
              "absolute top-2 right-2 z-[3] flex size-9 items-center justify-center rounded-full shadow-md transition-[background-color,color,opacity] duration-200 ease-out",
              saved
                ? "bg-primary text-primary-foreground"
                : cn(
                    "bg-black/50 text-white ring-1 ring-white/25 backdrop-blur-md ring-inset hover:bg-black/70",
                    "hover-device:opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 focus-visible:opacity-100",
                  ),
            )}
          >
            {saved ? <Check className="size-4" /> : <Plus className="size-4" />}
          </button>
        )}

        {/* ─ Play ─ the only thing a hover reveals; information never hides.
            The centring wrapper stays pointer-transparent for its whole life —
            it spans the entire still, so making *it* clickable would let it
            swallow every other control underneath (the watchlist pin sat under
            exactly that overlay once). Only the disc itself ever takes a
            pointer, and only once it is actually visible. ─ */}
        {canPlay && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-[2] flex items-center justify-center",
              "opacity-0 transition-opacity duration-200 ease-out",
              "group-hover/card:opacity-100 group-focus-within/card:opacity-100",
            )}
          >
            <button
              type="button"
              aria-label={t.browse.play}
              onClick={() => router.push(item.playHref!)}
              className="pointer-events-none flex size-12 scale-90 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out group-hover/card:pointer-events-auto group-hover/card:scale-100 group-focus-within/card:pointer-events-auto group-focus-within/card:scale-100 hover:scale-105 focus-visible:scale-100 active:scale-95"
            >
              <Play className="size-4.5 translate-x-px fill-current" />
            </button>
          </div>
        )}
      </div>

      {/* ─ The spine: poster tile at the seam, then type ─ */}
      <div className="flex items-start gap-3 px-1 pt-2.5 pb-1">
        <div className="relative -mt-11 aspect-2/3 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary shadow-e2 ring-2 ring-card sm:-mt-12 sm:w-16">
          <Image
            src={posterSrc}
            alt=""
            fill
            sizes="72px"
            className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.06]"
          />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate font-heading text-[15px] leading-tight font-semibold text-foreground transition-colors duration-150 ease-out group-hover/card:text-primary">
            {item.title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            <span className="nums">{item.releaseYear}</span>
            <span className="text-muted-foreground/40"> · </span>
            <span className="nums">{item.meta}</span>
            <span className="text-muted-foreground/40"> · </span>
            {item.genre}
          </p>
        </div>

        {item.rating !== null && (
          <span className="flex shrink-0 items-center gap-1 pt-0.5 text-[13px] font-semibold text-foreground nums">
            <Star className="size-3.5 fill-premium text-premium" />
            {item.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* ─ Full-card link overlay (below the real controls) ─ */}
      <Link
        href={item.href}
        aria-label={item.title}
        className="absolute inset-0 z-[1] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </article>
  );
}

export function MediaCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl bg-card/40 p-2 ring-1 ring-white/6 ring-inset",
        className,
      )}
    >
      <div className="aspect-video animate-pulse rounded-xl bg-secondary/60" />
      <div className="flex items-start gap-3 px-1 pt-2.5 pb-1">
        <div className="-mt-11 aspect-2/3 w-14 shrink-0 animate-pulse rounded-lg bg-secondary/70 ring-2 ring-card sm:-mt-12 sm:w-16" />
        <div className="min-w-0 flex-1 pt-1">
          <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-secondary/60" />
          <div className="mt-2 h-2.5 w-3/5 animate-pulse rounded-full bg-secondary/40" />
        </div>
      </div>
    </div>
  );
}
