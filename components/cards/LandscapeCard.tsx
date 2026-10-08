"use client";

import { memo, type ReactNode } from "react";
import Link from "next/link";

import { Artwork } from "@/components/system/Artwork";
import { PlayIcon } from "@/components/system/icons";
import { cn } from "@/lib/utils";

/**
 * THE LANDSCAPE CARD — Continue watching, episodes, wide promos (SHELL.md §9).
 *
 * 16:9, radius 12. A bottom scrim with the title set in the art (18/20 · 900,
 * uppercase) and, when there is progress, the red progress line along the
 * bottom. Under it: title and one meta line ("2h 4m · 38% watched" or
 * "S1 · E3 · 42m"). Hover/focus: art scales 1.04, title turns crimson-text,
 * a 52px white Play disc fades in over the art (decorative — the whole card
 * is the link, named by `a11yLabel`).
 *
 * `layout="rail"` = clamp(248px, 24vw, 360px) with snap; `"grid"` fills its cell.
 */
export interface LandscapeCardProps {
  title: string;
  /** Where the card goes — for Continue watching, the resume link. */
  href: string;
  imageUrl?: string | null;
  meta?: ReactNode;
  /** 0–100: the red line along the bottom of the art. */
  progress?: number | null;
  /** e.g. "Resume The Last Monsoon, 38% watched" (shellText.resume). Defaults to the title. */
  a11yLabel?: string;
  /** Set the title into the art (default true — backdrops rarely carry one). */
  artTitle?: boolean;
  /** Extra overlay inside the art, top-left (e.g. a Premium crown or an "S1 · E3" tag). */
  badge?: ReactNode;
  layout?: "rail" | "grid";
  priority?: boolean;
  sizes?: string;
  className?: string;
}

function LandscapeCardImpl({
  title,
  href,
  imageUrl,
  meta,
  progress,
  a11yLabel,
  artTitle = true,
  badge,
  layout = "grid",
  priority = false,
  sizes = "(max-width: 719px) 70vw, 360px",
  className,
}: LandscapeCardProps) {
  const pct = progress == null ? null : Math.max(0, Math.min(100, progress));

  return (
    <article
      className={cn(
        "group/card relative min-w-0",
        layout === "rail" && "mq-snap w-[clamp(248px,24vw,360px)] shrink-0",
        className,
      )}
    >
      <span className="relative block aspect-video overflow-hidden rounded-[12px] bg-raised">
        <Artwork src={imageUrl} seed={title} variant="landscape" sizes={sizes} priority={priority} />
        {(artTitle || pct !== null) && (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5" style={{ background: "var(--mq-scrim-card)" }} />
        )}
        {artTitle && (
          <span
            aria-hidden
            className="absolute right-3.5 bottom-5 left-3.5 line-clamp-2 text-lg leading-5 font-black tracking-[-0.02em] text-white uppercase"
          >
            {title}
          </span>
        )}
        {badge && <span className="absolute top-2 left-2">{badge}</span>}
        {pct !== null && (
          <span aria-hidden className="absolute right-3 bottom-2 left-3 h-[3px] rounded-[2px] bg-white/25">
            <span className="block h-[3px] rounded-[2px] bg-crimson" style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>

      <span className="mt-2.5 block truncate text-[15px] leading-5 font-bold text-fg transition-colors duration-150 group-hover/card:text-link">
        {title}
      </span>
      {meta && (
        <span className="block truncate text-[13px] leading-[18px] text-fg-faint tabular-nums">{meta}</span>
      )}

      <Link
        href={href}
        aria-label={a11yLabel ?? title}
        className="absolute inset-0 z-[1] rounded-[12px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex aspect-video items-center justify-center opacity-0 transition-opacity duration-200 group-focus-within/card:opacity-100 group-hover/card:opacity-100"
      >
        <span className="flex size-[52px] items-center justify-center rounded-full bg-play text-ink">
          <PlayIcon size={22} />
        </span>
      </span>
    </article>
  );
}

export const LandscapeCard = memo(LandscapeCardImpl);

export function LandscapeCardSkeleton({ layout = "grid", className }: { layout?: "rail" | "grid"; className?: string }) {
  return (
    <div aria-hidden className={cn("min-w-0", layout === "rail" && "w-[clamp(248px,24vw,360px)] shrink-0", className)}>
      <span className="mq-skeleton block aspect-video rounded-[12px]" />
      <span className="mq-skeleton mt-3 block h-3.5 w-3/5 rounded-[5px]" />
      <span className="mq-skeleton mt-2 block h-3 w-2/5 rounded-[5px]" />
    </div>
  );
}
