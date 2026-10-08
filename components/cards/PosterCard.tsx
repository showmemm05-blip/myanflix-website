"use client";

import { memo, type ReactNode } from "react";
import Link from "next/link";

import { Artwork } from "@/components/system/Artwork";
import { CheckIcon, CrownIcon, PlayIcon, PlusIcon, StarIcon } from "@/components/system/icons";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";

/**
 * THE POSTER CARD — movies and series (SHELL.md §8).
 *
 * 2:3, radius 10, no border, no shadow: the art IS the card. Under it one
 * title line (15/20 · 700) and one meta line (13/18 · faint). Gold crown on
 * Premium titles (always on), crimson NEW tab, optional red progress line.
 * Hover / keyboard focus (desktop): the art scales 1.04, the title turns
 * crimson-text, a white Play disc and a My List button fade in.
 *
 * Markup rule: an <article> with a full-card <Link> at z-1 and the real
 * buttons above it at z-2 — never a button inside a link.
 *
 * `layout="rail"` gives the rail width clamp(128px, 12.2vw, 184px) and snap;
 * `layout="grid"` fills its grid cell (min-width 0).
 *
 * Series: leave `playHref` out (series open their detail page first).
 * No image? Leave `imageUrl` null — the fallback scene is drawn and the
 * title is set into it.
 */
export interface PosterCardProps {
  title: string;
  href: string;
  imageUrl?: string | null;
  /** "2025 · 2h 4m" or "10 episodes · 2024". With `rating`, shown after the star. */
  meta?: ReactNode;
  /** Shows the gold star + number before the meta (Top rated rows, grids). */
  rating?: number | string | null;
  premium?: boolean;
  isNew?: boolean;
  /** 0–100: the red progress line inside the art. */
  progress?: number | null;
  /**
   * Shows the hover Play disc (movies only). Pass it ONLY when this viewer
   * can watch the title (free, or subscribed) — otherwise leave it null so
   * the card goes to the detail page instead of the player's paywall.
   */
  playHref?: string | null;
  /** Shows the My List button when given. */
  onToggleList?: () => void;
  listSaved?: boolean;
  /** Full accessible name of the card link, e.g. "The Last Monsoon, 2025, Drama, Premium". Defaults to the title. */
  a11yLabel?: string;
  layout?: "rail" | "grid";
  priority?: boolean;
  sizes?: string;
  className?: string;
}

function PosterCardImpl({
  title,
  href,
  imageUrl,
  meta,
  rating,
  premium = false,
  isNew = false,
  progress,
  playHref,
  onToggleList,
  listSaved = false,
  a11yLabel,
  layout = "grid",
  priority = false,
  sizes = "(max-width: 719px) 33vw, 184px",
  className,
}: PosterCardProps) {
  const { t } = useLanguage();
  const s = useSection(shellText);
  const pct = progress == null ? null : Math.max(0, Math.min(100, progress));
  const hasRating = rating !== null && rating !== undefined && rating !== "" && rating !== 0;

  return (
    <article
      className={cn(
        "group/card relative min-w-0",
        layout === "rail" && "mq-snap w-[clamp(128px,12.2vw,184px)] shrink-0",
        className,
      )}
    >
      <span className="relative block aspect-2/3 overflow-hidden rounded-[10px] bg-raised">
        <Artwork src={imageUrl} seed={title} variant="poster" sizes={sizes} priority={priority}>
          <span
            aria-hidden
            className="absolute right-2.5 bottom-3 left-2.5 line-clamp-3 text-sm leading-[15px] font-black tracking-[-0.02em] break-words text-white uppercase"
          >
            {title}
          </span>
        </Artwork>
        {premium && (
          <span
            role="img"
            aria-label={t.badges.premium}
            className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-[6px] bg-art-badge"
          >
            <CrownIcon size={13} className="text-gold" />
          </span>
        )}
        {isNew && (
          <span
            className={cn(
              "absolute left-0 h-5 rounded-r-[4px] bg-crimson px-[7px] text-[10px] leading-5 font-extrabold tracking-[0.06em] text-white",
              premium ? "top-10" : "top-2.5",
            )}
          >
            {s.newTag}
          </span>
        )}
        {pct !== null && (
          <span aria-hidden className="absolute right-2 bottom-1.5 left-2 h-[3px] rounded-[2px] bg-white/25">
            <span className="block h-[3px] rounded-[2px] bg-crimson" style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>

      <span className="mt-2.5 block truncate text-[15px] leading-5 font-bold text-fg transition-colors duration-150 group-hover/card:text-link">
        {title}
      </span>
      {(meta || hasRating) && (
        <span className="flex min-w-0 items-center gap-[5px] text-[13px] leading-[18px] text-fg-faint tabular-nums">
          {hasRating && (
            <>
              <StarIcon size={12} className="shrink-0 text-gold" />
              <span className="font-bold text-fg">
                {typeof rating === "number" ? rating.toFixed(1) : rating}
              </span>
              {meta && <span aria-hidden>·</span>}
            </>
          )}
          {meta && <span className="truncate">{meta}</span>}
        </span>
      )}

      <Link
        href={href}
        aria-label={a11yLabel ?? title}
        className="absolute inset-0 z-[1] rounded-[10px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      />

      {(playHref || onToggleList) && (
        <span className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex aspect-2/3 items-center justify-center">
          {playHref && (
            <Link
              href={playHref}
              aria-label={s.play(title)}
              // Only takes a tap once it is actually visible (hover or keyboard
              // focus). Touch screens have no hover, so a tap on the middle of
              // the poster always reaches the card link (the detail page),
              // never an invisible Play.
              className="pointer-events-none flex size-12 items-center justify-center rounded-full bg-play text-ink opacity-0 transition-[opacity,transform] duration-200 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100 group-hover/card:pointer-events-auto group-hover/card:opacity-100 focus-visible:opacity-100 active:scale-[0.97]"
            >
              <PlayIcon size={20} />
            </Link>
          )}
          {onToggleList && (
            <button
              type="button"
              aria-label={listSaved ? s.removeFromList(title) : s.addToList(title)}
              aria-pressed={listSaved}
              onClick={onToggleList}
              className={cn(
                "pointer-events-auto absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-art-badge text-white transition-opacity duration-200",
                // Touch has no hover: the button stays visible there so My List is always reachable.
                listSaved
                  ? "opacity-100"
                  : "hover-device:opacity-0 group-focus-within/card:opacity-100 group-hover/card:opacity-100 focus-visible:opacity-100",
              )}
            >
              {listSaved ? <CheckIcon size={16} className="text-link" strokeWidth={2.4} /> : <PlusIcon size={16} strokeWidth={2} />}
            </button>
          )}
        </span>
      )}
    </article>
  );
}

/** Memoised: grids hold up to sixty of these and re-render on every keystroke in a filter bar. */
export const PosterCard = memo(PosterCardImpl);

export function PosterCardSkeleton({ layout = "grid", className }: { layout?: "rail" | "grid"; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("min-w-0", layout === "rail" && "w-[clamp(128px,12.2vw,184px)] shrink-0", className)}
    >
      <span className="mq-skeleton block aspect-2/3 rounded-[10px]" />
      <span className="mq-skeleton mt-3 block h-3.5 w-4/5 rounded-[5px]" />
      <span className="mq-skeleton mt-2 block h-3 w-1/2 rounded-[5px]" />
    </div>
  );
}
