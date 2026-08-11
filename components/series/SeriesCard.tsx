import Link from "next/link";
import Image from "next/image";
import { AccessBadge } from "@/components/movie/AccessBadge";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { SeriesListItem } from "@/types/series";

export function SeriesCard({ series, className }: { series: SeriesListItem; className?: string }) {
  return (
    <Link
      href={`/series/${series.id}`}
      className={cn("group flex w-40 shrink-0 flex-col gap-2 transition-transform hover:-translate-y-1 sm:w-44 lg:w-48", className)}
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-white/[0.08] bg-muted">
        <Image
          src={series.posterUrl ?? FALLBACK_POSTER_URL}
          alt={series.title}
          fill
          sizes="(max-width: 640px) 160px, 192px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-1.5 top-1.5">
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

export function SeriesCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-40 shrink-0 sm:w-44 lg:w-48", className)}>
      <div className="aspect-2/3 animate-pulse rounded-xl bg-muted" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  );
}
