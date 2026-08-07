"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Info, Play, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { formatDuration } from "@/lib/format";
import { FALLBACK_COVER_URL } from "@/lib/placeholder";
import type { Movie } from "@/types/movie";

const ROTATE_INTERVAL_MS = 7000;

export function HeroBanner({ movies }: { movies: Movie[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();

  useEffect(() => {
    if (movies.length <= 1) return;
    const interval = setInterval(() => setActiveIndex((i) => (i + 1) % movies.length), ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [movies.length]);

  if (movies.length === 0) return null;
  const movie = movies[activeIndex];
  const hasAccess = movie.accessType === "FREE" || isSubscribed;
  const inWatchlist = isInWatchlist(movie.id);

  return (
    <section className="relative h-[68vh] min-h-[480px] w-full overflow-hidden sm:h-[78vh]">
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <Image
            src={movie.coverUrl ?? FALLBACK_COVER_URL}
            alt={movie.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex h-full max-w-[1600px] flex-col justify-end gap-4 px-4 pb-14 sm:px-6 lg:px-8">
        <motion.div
          key={`${movie.id}-content`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex max-w-xl flex-col gap-4"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="rounded bg-primary/15 px-2 py-0.5 text-primary">Featured</span>
            <span>{movie.releaseYear}</span>
            <span>&middot;</span>
            <span>{formatDuration(movie.duration)}</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{movie.title}</h1>

          <p className="line-clamp-3 text-sm text-muted-foreground sm:text-base">{movie.description}</p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button size="lg" render={<Link href={`/movie/${movie.id}`} />} nativeButton={false}>
              <Play className="size-4 fill-current" />
              {hasAccess ? "Watch Now" : "Subscribe to Watch"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href={`/movie/${movie.id}`} />}
              nativeButton={false}
            >
              <Info className="size-4" />
              More Info
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => toggleWatchlist(movie.id)}
              aria-label="Toggle watchlist"
            >
              {inWatchlist ? <Check className="size-4" /> : <Plus className="size-4" />}
              {inWatchlist ? "In Watchlist" : "Watchlist"}
            </Button>
          </div>
        </motion.div>

        {movies.length > 1 && (
          <div className="flex items-center gap-1.5 pt-4">
            {movies.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setActiveIndex(i)}
                aria-label={`Show ${m.title}`}
                className={`h-1 rounded-full transition-all ${i === activeIndex ? "w-8 bg-primary" : "w-4 bg-white/25"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
