"use client";

import { memo, type ReactNode } from "react";
import Link from "next/link";

import { Artwork } from "@/components/system/Artwork";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";

/**
 * THE BOOK CARD (SHELL.md §10).
 *
 * 5:7, radius 3/10/10/3 with a darker 5px spine. With no cover, the fallback
 * scene carries the title and author set in the art. Under the cover: title,
 * then "Author · N chapters". An optional overline (11/14, bold, uppercase,
 * faint) sits above the title — the Books board's category label. Optional red reading line. Books have no
 * Premium flag and no rating (the API has neither).
 *
 * `layout="rail"` = clamp(120px, 10.5vw, 160px) with snap; `"grid"` fills its cell.
 */
export interface BookCardProps {
  title: string;
  author?: string | null;
  href: string;
  coverUrl?: string | null;
  /** Small uppercase label above the title (e.g. the book's category). */
  overline?: ReactNode;
  /** "Hnin Wai · 18 chapters". */
  meta?: ReactNode;
  isNew?: boolean;
  /** 0–100: the reading line under the meta. */
  progress?: number | null;
  /** Defaults to "{title} by {author}". */
  a11yLabel?: string;
  layout?: "rail" | "grid";
  priority?: boolean;
  sizes?: string;
  className?: string;
}

function BookCardImpl({
  title,
  author,
  href,
  coverUrl,
  overline,
  meta,
  isNew = false,
  progress,
  a11yLabel,
  layout = "grid",
  priority = false,
  sizes = "(max-width: 719px) 33vw, 160px",
  className,
}: BookCardProps) {
  const s = useSection(shellText);
  const pct = progress == null ? null : Math.max(0, Math.min(100, progress));

  return (
    <article
      className={cn(
        "group/card relative min-w-0",
        layout === "rail" && "mq-snap w-[clamp(120px,10.5vw,160px)] shrink-0",
        className,
      )}
    >
      <span className="relative block aspect-[5/7] overflow-hidden rounded-[3px_10px_10px_3px] bg-raised">
        <Artwork src={coverUrl} seed={title} variant="book" sizes={sizes} priority={priority}>
          <span
            aria-hidden
            className="absolute top-3.5 right-2.5 left-3.5 line-clamp-2 text-sm leading-4 font-black tracking-[-0.01em] text-white"
          >
            {title}
          </span>
          {author && (
            <span
              aria-hidden
              className="absolute top-[52px] right-2.5 left-3.5 line-clamp-1 text-[10px] leading-3 font-bold tracking-[0.08em] text-white/80 uppercase"
            >
              {author}
            </span>
          )}
        </Artwork>
        {/* The spine stays over a real cover too. */}
        <span aria-hidden className="absolute inset-y-0 left-0 w-[5px] bg-ink/35" />
        {isNew && (
          <span className="absolute bottom-2.5 left-0 h-5 rounded-r-[4px] bg-crimson px-[7px] text-[10px] leading-5 font-extrabold tracking-[0.06em] text-white">
            {s.newTag}
          </span>
        )}
      </span>

      {overline && (
        <span className="mt-2.5 block truncate text-[11px] leading-[14px] font-bold tracking-[0.06em] text-fg-faint uppercase">
          {overline}
        </span>
      )}
      <span
        className={cn(
          "block truncate text-[15px] leading-5 font-bold text-fg transition-colors duration-150 group-hover/card:text-link",
          overline ? "mt-0.5" : "mt-2.5",
        )}
      >
        {title}
      </span>
      {meta && <span className="block truncate text-[13px] leading-[18px] text-fg-faint">{meta}</span>}
      {pct !== null && (
        <span aria-hidden className="mt-2 block h-[3px] rounded-[2px] bg-white/14">
          <span className="block h-[3px] rounded-[2px] bg-crimson" style={{ width: `${pct}%` }} />
        </span>
      )}

      <Link
        href={href}
        aria-label={a11yLabel ?? (author ? s.bookBy(title, author) : title)}
        className="absolute inset-0 z-[1] rounded-[3px_10px_10px_3px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      />
    </article>
  );
}

export const BookCard = memo(BookCardImpl);

export function BookCardSkeleton({ layout = "grid", className }: { layout?: "rail" | "grid"; className?: string }) {
  return (
    <div aria-hidden className={cn("min-w-0", layout === "rail" && "w-[clamp(120px,10.5vw,160px)] shrink-0", className)}>
      <span className="mq-skeleton block aspect-[5/7] rounded-[3px_10px_10px_3px]" />
      <span className="mq-skeleton mt-3 block h-3.5 w-4/5 rounded-[5px]" />
      <span className="mq-skeleton mt-2 block h-3 w-1/2 rounded-[5px]" />
    </div>
  );
}
