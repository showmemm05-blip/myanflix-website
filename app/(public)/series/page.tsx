"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Tv } from "lucide-react";
import { EmptyState } from "@/components/empty/EmptyState";
import { MovieCardSkeleton } from "@/components/movie/MovieCard";
import { AccessBadge } from "@/components/movie/AccessBadge";
import { seriesService } from "@/services/api/seriesService";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import type { SeriesListItem } from "@/types/series";

function SeriesCard({ series }: { series: SeriesListItem }) {
  return (
    <Link
      href={`/series/${series.id}`}
      className="group flex flex-col gap-2 transition-transform hover:-translate-y-1"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-white/[0.06] bg-muted">
        <Image
          src={series.posterUrl ?? FALLBACK_POSTER_URL}
          alt={series.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2">
          <AccessBadge accessType={series.accessType} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{series.title}</p>
        <p className="text-xs text-muted-foreground">
          {series.releaseYear} &middot; {series.episodeCount} episode{series.episodeCount === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}

export default function SeriesListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["series"],
    queryFn: () => seriesService.getSeries({ limit: 100 }),
  });

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">Series</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Tv} title="No series yet" description="Check back soon — new shows are on the way." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((series) => (
            <SeriesCard key={series.id} series={series} />
          ))}
        </div>
      )}
    </div>
  );
}
