"use client";

import { useQuery } from "@tanstack/react-query";

import { FeaturedMedia } from "./FeaturedMedia";
import { MediaRail } from "./MediaRail";
import { MovieCard, MovieCardSkeleton } from "./MovieCard";
import { BookCard } from "./BookCard";
import { MusicCard } from "./MusicCard";
import { movieToBrowseItem } from "@/components/browse/browse-item";
import { useLanguage } from "@/lib/context/language-context";
import { BOOKS } from "@/lib/media/books-data";
import { ALBUMS } from "@/lib/media/music-data";
import { formatDuration } from "@/lib/format";
import { movieService } from "@/services/api/movieService";

/**
 * ALL MEDIA — the organized overview, not a mixed grid.
 *
 * Opens with the featured mosaic (one pick per medium), then one shelf per
 * medium in a fixed order — movies, books, music — each with its own card
 * design, its own editorial row title under a medium kicker, and a View All
 * into its category page. Discovery happens here; depth happens one tap away.
 *
 * The two movie queries reuse the home page's exact query keys, so a user
 * arriving from the home screen renders this from cache instead of refetching.
 */
export function AllMediaView() {
  const { t } = useLanguage();

  const topRated = useQuery({
    queryKey: ["home", "top-rated"],
    queryFn: () => movieService.getTopRated(),
  });
  const trending = useQuery({
    queryKey: ["home", "most-purchased"],
    queryFn: () => movieService.getMostPurchased(),
  });

  const featuredMovie = topRated.data?.[0] ?? trending.data?.[0] ?? null;
  const isMovieLoading = topRated.isLoading || trending.isLoading;

  const movieItems = (trending.data ?? [])
    .slice(0, 14)
    .map((movie) => movieToBrowseItem(movie, formatDuration(movie.duration)));

  const featuredBook = BOOKS.find((b) => b.featured) ?? BOOKS[0];
  const featuredAlbum = ALBUMS.find((a) => a.featured) ?? ALBUMS[0];

  return (
    <div className="flex flex-col gap-10 pt-5 pb-20 sm:gap-12">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <FeaturedMedia
          movie={featuredMovie}
          isMovieLoading={isMovieLoading}
          book={featuredBook}
          album={featuredAlbum}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 sm:gap-12">
        {(trending.isLoading || movieItems.length > 0) && (
          <MediaRail
            kicker={t.search.movies}
            title={t.media.trendingMovies}
            viewAllHref="/media/movies"
          >
            {trending.isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <MovieCardSkeleton key={i} className="w-32 shrink-0 sm:w-40" />
                ))
              : movieItems.map((item) => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    sizes="(max-width: 640px) 130px, 160px"
                    className="w-32 shrink-0 snap-start sm:w-40"
                  />
                ))}
          </MediaRail>
        )}

        <MediaRail kicker={t.search.books} title={t.media.newBooks} viewAllHref="/media/books">
          {BOOKS.map((book) => (
            <BookCard key={book.id} book={book} className="w-32 shrink-0 snap-start sm:w-36" />
          ))}
        </MediaRail>

        <MediaRail kicker={t.search.music} title={t.media.freshMusic} viewAllHref="/media/music">
          {ALBUMS.map((album) => (
            <MusicCard key={album.id} album={album} className="w-36 shrink-0 snap-start sm:w-44" />
          ))}
        </MediaRail>
      </div>
    </div>
  );
}
