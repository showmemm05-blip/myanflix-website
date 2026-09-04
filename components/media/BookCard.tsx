"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

import { cn } from "@/lib/utils";
import type { Book } from "@/types/book";

const FALLBACK_COVER = "https://picsum.photos/seed/myanflix-book/480/672";

/**
 * THE BOOK CARD — a hardcover on a shelf, not a movie poster.
 *
 * Deliberately its own object, sharing only the design system's tokens with
 * MovieCard and MusicCard:
 *
 *  - the COVER is a physical book: a squared-off spine edge on the left with a
 *    crease of light, a stack of page edges on the right, and a soft shelf
 *    shadow underneath. On hover the book lifts off the shelf with a slight
 *    tilt — a browse gesture, not a zoom;
 *  - the TYPE is literary, not cinematic: a small category over the title, the
 *    title in the heading face with room to wrap to two lines, then the author
 *    — the line a reader actually scans a shelf by.
 *
 * The whole card is one link to the book's detail page, as a full-card overlay
 * at z-[1] rather than an anchor wrapping the article — same rule MediaCard
 * follows, so a future control on the cover can sit above it at z-[2].
 */
export const BookCard = memo(function BookCard({
  book,
  className,
  priority = false,
}: {
  book: Book;
  className?: string;
  priority?: boolean;
}) {
  const category = book.categories[0]?.name;

  return (
    <article
      className={cn("group/book relative flex min-w-0 flex-col", className)}
    >
      <Link
        href={`/books/${book.id}`}
        aria-label={book.title}
        className="focus-ring absolute inset-0 z-[1] rounded-lg"
      />

      <div className="relative">
        {/* ─ The cover ─ */}
        <div
          className={cn(
            "relative aspect-[5/7] overflow-hidden rounded-r-lg rounded-l-[4px] bg-secondary/60 shadow-e1 ring-1 ring-white/10 ring-inset",
            "transition-[transform,box-shadow] duration-300 ease-out",
            "group-hover/book:-translate-y-2 group-hover/book:-rotate-1 group-hover/book:shadow-e3",
          )}
        >
          <Image
            src={book.coverUrl ?? FALLBACK_COVER}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 23vw, 200px"
            className="object-cover"
          />
          {/* Spine crease: the fold of light where a hardcover's board meets the spine. */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-[7px] bg-gradient-to-r from-black/50 via-white/15 to-transparent"
          />
          {/* Page block: the pale stack of page edges past the board. */}
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-l from-white/30 to-transparent"
          />
        </div>

        {/* ─ Shelf shadow — the book lifts, the shadow stays on the shelf ─ */}
        <div
          aria-hidden
          className="mx-2.5 -mt-1 h-2 rounded-[100%] bg-black/50 blur-[5px] transition-[opacity,transform] duration-300 ease-out group-hover/book:scale-x-90 group-hover/book:opacity-60"
        />
      </div>

      {/* ─ The shelf label: category · title · author ─ */}
      <div className="min-w-0 px-0.5 pt-3">
        {category && (
          <p className="truncate text-[10px] font-semibold tracking-[0.14em] text-primary/85 uppercase">
            {category}
          </p>
        )}
        <h3 className="mt-1 line-clamp-2 font-heading text-sm leading-snug font-semibold text-foreground transition-colors duration-150 ease-out group-hover/book:text-primary">
          {book.title}
        </h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {book.author}
        </p>
      </div>
    </article>
  );
});
