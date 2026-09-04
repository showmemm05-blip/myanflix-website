"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Crown, Play, Plus, Star } from "lucide-react";

import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { BrowseItem } from "@/components/browse/browse-item";

/**
 * THE TITLE CARD — one poster, one card, everywhere.
 *
 * A 2:3 poster IS the card. The words beneath it are one title line and one
 * quiet meta line; everything else earns its place only on hover — the play
 * disc and the watchlist pin — so a rail or a grid of these reads as artwork
 * rather than as a wall of controls.
 *
 * This replaces the wide "dossier" card that used to live here (a 16:9 still
 * with a small poster tile straddling the seam). Two different card shapes
 * meant /media looked like one product and the rails looked like another, and
 * the landscape card gave a film's own artwork the smallest element on the
 * plate. Portrait is how a catalogue of films is read, so it is now the only
 * shape — `media/MovieCard` and `browse/PosterCard` are both thin aliases of
 * this component.
 *
 * The one always-on overlay is a gold crown on premium titles: access changes
 * what a click can do, so it must not hide on hover — but at this width the
 * full text badge would cover a third of the artwork, so the disc carries the
 * same meaning in one glyph (its accessible name spells it out).
 *
 * Markup: an <article> with a full-card <Link> overlay at z-[1] and the real
 * controls above it at z-[2+] — never a button inside an anchor.
 *
 * MEMOISED, and not as a reflex: a keystroke in the browse bar re-renders the
 * whole surface, and the grid below it holds up to sixty of these. The props
 * are a memoised `item` plus two strings, so each one bails out instead of
 * re-running an <Image>, two contexts and a router hook. (Context updates
 * still get through — memo only skips re-renders caused by an unchanged
 * parent.)
 */
function MediaCardImpl({
  item,
  className,
  sizes = "(max-width: 640px) 46vw, (max-width: 1024px) 23vw, (max-width: 1536px) 16vw, 220px",
  priority = false,
}: {
  item: BrowseItem;
  className?: string;
  /** Passed through to next/image for grids/rails with unusual column counts. */
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

  return (
    <article className={cn("group/card relative isolate flex min-w-0 flex-col", className)}>
      {/* ─ Poster ─ */}
      <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-secondary/60 shadow-e1 ring-1 ring-white/8 transition-[box-shadow] duration-200 ease-out ring-inset group-hover/card:shadow-e2 group-hover/card:ring-white/16">
        <Image
          src={posterSrc}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.05]"
        />

        {item.accessType === "SUBSCRIPTION" && (
          <span
            // role="img" because the Crown SVG itself is aria-hidden (lucide
            // hides childless icons), and a bare <span> computes to
            // role=generic, where ARIA prohibits naming — the aria-label was
            // being dropped, so premium had no accessible name at all.
            role="img"
            aria-label={t.badges.premium}
            title={t.badges.premium}
            className="absolute top-1.5 left-1.5 z-[2] flex size-5.5 items-center justify-center rounded-full bg-premium text-premium-foreground shadow-e1"
          >
            <Crown className="size-3" />
          </span>
        )}

        {item.watchlistId && (
          <button
            type="button"
            aria-label={saved ? t.browse.inWatchlist : t.browse.addToWatchlist}
            aria-pressed={saved}
            onClick={() => toggleWatchlist(item.watchlistId!)}
            className={cn(
              "absolute top-1.5 right-1.5 z-[3] flex size-7 items-center justify-center rounded-full transition-[background-color,color,opacity] duration-200 ease-out",
              saved
                ? "bg-primary text-primary-foreground shadow-e1"
                : cn(
                    "bg-black/50 text-white ring-1 ring-white/25 backdrop-blur-md ring-inset hover:bg-black/70",
                    "hover-device:opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 focus-visible:opacity-100",
                  ),
            )}
          >
            {saved ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
          </button>
        )}

        {/* ─ Play ─ the only thing a hover reveals; information never hides.
            The centring wrapper stays pointer-transparent for its whole life —
            it spans the entire poster, so making *it* clickable would let it
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
              className="pointer-events-none flex size-10 scale-90 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out group-hover/card:pointer-events-auto group-hover/card:scale-100 group-focus-within/card:pointer-events-auto group-focus-within/card:scale-100 hover:scale-105 focus-visible:scale-100 active:scale-95"
            >
              <Play className="size-4 translate-x-px fill-current" />
            </button>
          </div>
        )}
      </div>

      {/* ─ Title + one meta line — the essentials, nothing else ─ */}
      <div className="min-w-0 px-0.5 pt-2">
        <h3 className="truncate text-[13px] leading-tight font-medium text-foreground transition-colors duration-150 ease-out group-hover/card:text-primary sm:text-sm">
          {item.title}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
          <span className="nums">{item.releaseYear}</span>
          {item.rating !== null ? (
            <>
              <span className="text-muted-foreground/40">·</span>
              <Star className="size-3 fill-premium text-premium" />
              <span className="nums">{item.rating.toFixed(1)}</span>
            </>
          ) : item.meta !== null ? (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="truncate nums">{item.meta}</span>
            </>
          ) : null}
        </p>
      </div>

      {/* ─ Full-card link overlay (below the real controls) ─ */}
      <Link
        href={item.href}
        aria-label={item.title}
        className="absolute inset-0 z-[1] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </article>
  );
}

export const MediaCard = memo(MediaCardImpl);

export function MediaCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="aspect-2/3 animate-pulse rounded-xl bg-secondary/60 ring-1 ring-white/6 ring-inset" />
      <div className="px-0.5 pt-2">
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-secondary/60" />
        <div className="mt-1.5 h-2.5 w-1/2 animate-pulse rounded-full bg-secondary/40" />
      </div>
    </div>
  );
}
