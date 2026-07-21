"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Check, Clock, Film, Play, Plus, Share2, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MovieRow } from "@/components/movie/MovieRow";
import { PageLoader } from "@/components/loading/Spinner";
import { EmptyState } from "@/components/empty/EmptyState";
import { PurchaseDialog } from "@/components/dialogs/PurchaseDialog";
import { ShareDialog } from "@/components/modals/ShareDialog";
import { useMovie, useSimilarMovies } from "@/hooks/use-movies";
import { useLibrary } from "@/lib/context/library-context";
import { formatDuration } from "@/lib/format";
import { formatKyat } from "@/lib/currency";
import { FALLBACK_COVER_URL, FALLBACK_POSTER_URL } from "@/lib/placeholder";

export default function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: movie, isLoading } = useMovie(id);
  const { data: similarMovies, isLoading: isSimilarLoading } = useSimilarMovies(id);
  const { isPurchased, isInWatchlist, toggleWatchlist } = useLibrary();

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  if (isLoading) return <PageLoader />;

  if (!movie) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={Film}
          title="Movie not found"
          description="This title may have been removed."
          action={
            <Button render={<Link href="/movies" />} nativeButton={false}>
              Back to Movies
            </Button>
          }
        />
      </div>
    );
  }

  const owned = isPurchased(movie.id);
  const inWatchlist = isInWatchlist(movie.id);

  return (
    <div className="flex flex-col">
      <div className="relative h-[50vh] min-h-[360px] w-full overflow-hidden">
        <Image
          src={movie.coverUrl ?? FALLBACK_COVER_URL}
          alt={movie.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
      </div>

      <div className="mx-auto -mt-32 flex w-full max-w-[1600px] flex-col gap-6 px-4 sm:px-6 lg:-mt-40 lg:flex-row lg:px-8">
        <div className="relative mx-auto -mt-16 aspect-2/3 w-44 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-2xl sm:w-56 lg:mx-0 lg:mt-0">
          <Image src={movie.posterUrl ?? FALLBACK_POSTER_URL} alt={movie.title} fill sizes="224px" className="object-cover" />
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {movie.releaseYear}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatDuration(movie.duration)}
            </span>
          </div>

          <h1 className="text-2xl font-bold sm:text-4xl">{movie.title}</h1>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md bg-warning/15 px-2 py-1 text-sm font-semibold text-warning">
              <Star className="size-4 fill-current" />
              {movie.rating.toFixed(1)}
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{movie.genre}</span>
            {movie.categories.map((category) => (
              <span key={category.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                {category.name}
              </span>
            ))}
          </div>

          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{movie.description}</p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {owned ? (
              <Button size="lg" render={<Link href={`/player/${movie.id}`} />} nativeButton={false}>
                <Play className="size-4 fill-current" />
                Watch Now
              </Button>
            ) : (
              <Button size="lg" onClick={() => setPurchaseOpen(true)}>
                <ShoppingBag className="size-4" />
                Buy for {formatKyat(movie.price)}
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={() => toggleWatchlist(movie.id)}>
              {inWatchlist ? <Check className="size-4" /> : <Plus className="size-4" />}
              {inWatchlist ? "In Watchlist" : "Watchlist"}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setShareOpen(true)}>
              <Share2 className="size-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-lg font-semibold">Movie Information</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Language</dt>
            <dd className="mt-0.5 font-medium">{movie.language}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Release Year</dt>
            <dd className="mt-0.5 font-medium">{movie.releaseYear}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="mt-0.5 font-medium">{formatDuration(movie.duration)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Genre</dt>
            <dd className="mt-0.5 font-medium">{movie.genre}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Categories</dt>
            <dd className="mt-0.5 font-medium">
              {movie.categories.length > 0 ? movie.categories.map((c) => c.name).join(", ") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rating</dt>
            <dd className="mt-0.5 font-medium">{movie.rating.toFixed(1)} / 10</dd>
          </div>
        </dl>
      </div>

      <div className="mt-10">
        <MovieRow title="Similar Movies" movies={similarMovies ?? []} isLoading={isSimilarLoading} />
      </div>

      <PurchaseDialog movie={movie} open={purchaseOpen} onOpenChange={setPurchaseOpen} />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={movie.title}
        url={typeof window !== "undefined" ? window.location.href : ""}
      />
    </div>
  );
}
