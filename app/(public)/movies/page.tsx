"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Film } from "lucide-react";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { MovieGridSkeleton } from "@/components/skeletons/MovieGridSkeleton";
import { FilterPanel, type FilterState } from "@/components/filters/FilterPanel";
import { EmptyState } from "@/components/empty/EmptyState";
import { useMovies } from "@/hooks/use-movies";
import type { MovieSortOption } from "@/types/movie";

function MoviesPageContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({
    sort: (searchParams.get("sort") as MovieSortOption) ?? "newest",
    genre: searchParams.get("genre") ?? undefined,
  });

  const { data, isLoading } = useMovies({ ...filters, limit: 60 });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">All Movies</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse the full MyanFlix catalog.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <FilterPanel
            filters={filters}
            onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
            onClear={() => setFilters({ sort: "newest" })}
          />
        </aside>

        <div>
          {!isLoading && data?.items.length === 0 ? (
            <EmptyState icon={Film} title="No movies found" description="Try adjusting your filters." />
          ) : (
            <MovieGrid movies={data?.items ?? []} isLoading={isLoading} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MoviesPage() {
  return (
    <Suspense fallback={<MovieGridSkeleton />}>
      <MoviesPageContent />
    </Suspense>
  );
}
