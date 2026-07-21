"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, Plus, Check } from "lucide-react";
import { RatingBadge } from "./RatingBadge";
import { PriceBadge } from "./PriceBadge";
import { PurchasedBadge } from "./PurchasedBadge";
import { useLibrary } from "@/lib/context/library-context";
import { formatDuration } from "@/lib/format";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";

export function MovieCard({ movie, className }: { movie: Movie; className?: string }) {
  const { isPurchased, isInWatchlist, toggleWatchlist } = useLibrary();
  const owned = isPurchased(movie.id);
  const inWatchlist = isInWatchlist(movie.id);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn("group relative w-40 shrink-0 sm:w-44 lg:w-48", className)}
    >
      <Link href={`/movie/${movie.id}`} className="block">
        <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-white/[0.08] bg-muted">
          <Image
            src={movie.posterUrl ?? FALLBACK_POSTER_URL}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 160px, 192px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-1.5 top-1.5">
            <RatingBadge rating={movie.rating} />
          </div>
          <div className="absolute right-1.5 top-1.5">
            {owned ? <PurchasedBadge /> : <PriceBadge price={movie.price} />}
          </div>

          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Play className="size-4 fill-current" />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleWatchlist(movie.id);
                  }}
                  className="flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                >
                  {inWatchlist ? <Check className="size-4" /> : <Plus className="size-4" />}
                </button>
              </div>
              <p className="text-center text-[11px] text-white/70">{formatDuration(movie.duration)}</p>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <p className="truncate text-sm font-medium text-foreground">{movie.title}</p>
          <p className="text-xs text-muted-foreground">
            {movie.releaseYear} &middot; {movie.genre}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export function MovieCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-40 shrink-0 sm:w-44 lg:w-48", className)}>
      <div className="aspect-2/3 animate-pulse rounded-xl bg-muted" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  );
}

