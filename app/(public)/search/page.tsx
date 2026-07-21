"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, List, Search as SearchIcon } from "lucide-react";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { MovieGridSkeleton } from "@/components/skeletons/MovieGridSkeleton";
import { FilterPanel, type FilterState } from "@/components/filters/FilterPanel";
import { EmptyState } from "@/components/empty/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RatingBadge } from "@/components/movie/RatingBadge";
import { PriceBadge } from "@/components/movie/PriceBadge";
import { useSearch } from "@/hooks/use-movies";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDuration } from "@/lib/format";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("q") ?? "");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<FilterState>({ sort: "newest" });
  const debouncedTerm = useDebounce(term, 300);

  const { data, isLoading } = useSearch({ search: debouncedTerm, ...filters, limit: 60 });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Search</h1>
        <div className="relative mt-4 max-w-lg">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by title..."
            className="bg-secondary/60 pl-9"
            autoFocus
          />
        </div>
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
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Searching..." : `${data?.total ?? 0} results`}
            </p>
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] p-0.5">
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <MovieGridSkeleton count={12} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title="No results found"
              description={term ? `We couldn't find anything matching "${term}".` : "Start typing to search the catalog."}
            />
          ) : view === "grid" ? (
            <MovieGrid movies={data.items} />
          ) : (
            <div className="flex flex-col gap-3">
              {data.items.map((movie) => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}`}
                  className="glass-card flex gap-4 rounded-xl border-white/[0.08] p-3 transition-colors hover:bg-secondary/40"
                >
                  <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image src={movie.posterUrl ?? FALLBACK_POSTER_URL} alt={movie.title} fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                    <p className="truncate font-semibold">{movie.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {movie.releaseYear} &middot; {movie.genre} &middot; {formatDuration(movie.duration)}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{movie.description}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <RatingBadge rating={movie.rating} className={cn("static bg-secondary")} />
                      <PriceBadge price={movie.price} className={cn("static bg-secondary")} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<MovieGridSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}
