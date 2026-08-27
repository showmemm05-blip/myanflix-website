"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, Film, Music, Star } from "lucide-react";

import { Chip } from "@/components/system/Chip";
import { useLanguage } from "@/lib/context/language-context";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";
import type { Book } from "@/types/book";
import type { MusicAlbum } from "@/types/music";

/**
 * THE FEATURED MOSAIC — the All page's opening move: one pick per medium.
 *
 * A big film panel on the left (the medium with real artwork earns the real
 * estate) and a stacked pair on the right — the book of the week on a warm
 * gold wash, the album spotlight on the brand violet — so the very first
 * screen of /media says "this library is three kinds of thing", not "this is
 * a movie site with two extra tabs".
 *
 * The film panel links to its detail page; the book and album panels link to
 * their category pages (their catalogs are previews without detail pages yet).
 */
export function FeaturedMedia({
  movie,
  isMovieLoading,
  book,
  album,
}: {
  movie: Movie | null;
  isMovieLoading: boolean;
  book: Book;
  album: MusicAlbum;
}) {
  const { t } = useLanguage();

  return (
    <section className="grid gap-3 sm:gap-4 lg:grid-cols-5">
      {/* ─ Film spotlight ─ */}
      {isMovieLoading && !movie ? (
        <div className="aspect-video animate-pulse rounded-2xl bg-secondary/50 ring-1 ring-white/6 ring-inset lg:col-span-3 lg:aspect-auto lg:min-h-[320px]" />
      ) : movie ? (
        <Link
          href={`/movie/${movie.id}`}
          className={cn(
            "group/film focus-ring relative isolate block overflow-hidden rounded-2xl ring-1 ring-white/10 ring-inset lg:col-span-3",
            "aspect-video lg:aspect-auto lg:min-h-[320px]",
            "shadow-e2 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-e3",
          )}
        >
          <Image
            src={movie.coverUrl ?? movie.posterUrl ?? FALLBACK_POSTER_URL}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 92vw, 60vw"
            className="object-cover transition-transform duration-700 ease-out group-hover/film:scale-[1.03]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2.5 p-4 sm:p-6">
            <Chip tone="primary" variant="soft" size="sm" className="backdrop-blur-md">
              <Film />
              {t.media.filmSpotlight}
            </Chip>
            <h2 className="line-clamp-2 max-w-2xl font-heading text-2xl leading-tight font-bold tracking-tight text-white sm:text-3xl">
              {movie.title}
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-white/75">
              <span className="nums">{movie.releaseYear}</span>
              <span className="text-white/35">·</span>
              <Star className="size-3.5 fill-premium text-premium" />
              <span className="nums">{movie.rating.toFixed(1)}</span>
              <span className="text-white/35">·</span>
              {movie.genre}
            </p>
          </div>
        </Link>
      ) : (
        /* The catalog request failed or came back empty — offer the category
           instead of an empty frame. */
        <Link
          href="/media/movies"
          className="group/film focus-ring relative isolate flex aspect-video flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl bg-card/50 ring-1 ring-white/10 ring-inset lg:col-span-3 lg:aspect-auto lg:min-h-[320px]"
        >
          <div aria-hidden className="aurora-wash-soft absolute inset-0 opacity-60 blur-2xl" />
          <span className="relative flex size-14 items-center justify-center rounded-full bg-white/6 text-muted-foreground ring-1 ring-white/10 ring-inset">
            <Film className="size-6" />
          </span>
          <span className="relative text-sm font-medium text-muted-foreground transition-colors duration-150 group-hover/film:text-foreground">
            {t.search.movies}
          </span>
        </Link>
      )}

      {/* ─ Book of the week + album spotlight ─ */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:col-span-2 lg:grid-cols-1">
        <Link
          href="/media/books"
          className={cn(
            "group/fbook focus-ring relative isolate flex items-center gap-4 overflow-hidden rounded-2xl p-4 sm:p-5",
            "bg-premium/8 ring-1 ring-white/10 ring-inset",
            "shadow-e1 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-premium/12 hover:shadow-e2",
          )}
        >
          <div className="relative aspect-[5/7] w-16 shrink-0 overflow-hidden rounded-r-md rounded-l-[3px] shadow-e2 ring-1 ring-white/10 ring-inset transition-transform duration-300 ease-out group-hover/fbook:-rotate-2 sm:w-20">
            <Image src={book.coverUrl} alt="" fill sizes="80px" className="object-cover" />
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 w-[5px] bg-gradient-to-r from-black/50 via-white/15 to-transparent"
            />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-premium uppercase">
              <BookOpen className="size-3.5" />
              {t.media.bookOfTheWeek}
            </p>
            <h3 className="mt-1.5 line-clamp-2 font-heading text-base leading-snug font-semibold text-foreground">
              {book.title}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">{book.author}</p>
          </div>
        </Link>

        <Link
          href="/media/music"
          className={cn(
            "group/falbum focus-ring relative isolate flex items-center gap-4 overflow-hidden rounded-2xl p-4 sm:p-5",
            "bg-primary/8 ring-1 ring-white/10 ring-inset",
            "shadow-e1 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/12 hover:shadow-e2",
          )}
        >
          <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg shadow-e2 ring-1 ring-white/10 ring-inset transition-transform duration-300 ease-out group-hover/falbum:scale-[1.04] sm:w-20">
            <Image src={album.artworkUrl} alt="" fill sizes="80px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
              <Music className="size-3.5" />
              {t.media.albumSpotlight}
            </p>
            <h3 className="mt-1.5 line-clamp-2 font-heading text-base leading-snug font-semibold text-foreground">
              {album.title}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {album.artist}
              <span className="text-muted-foreground/40"> · </span>
              <span className="nums">{album.releaseYear}</span>
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
