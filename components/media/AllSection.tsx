"use client";

import { forwardRef, type ReactNode } from "react";

import { CardGrid, GridLoadingMore } from "@/components/system";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { Button } from "@/components/ui/button";
import type { ActivePill } from "@/components/browse/ActiveFilterPills";
import type { GridDensity } from "@/components/browse/PosterGrid";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import {
  AllSectionHeader,
  AppliedFilters,
  DensitySwitch,
  FilterButton,
  GenreChipRow,
  InfiniteSentinel,
  SortSelect,
} from "./CatalogParts";

/**
 * THE "ALL …" SECTION of a hub (Media.dc.html "All movies", MediaSeries
 * "All series"): heading + live count, sort chip, density switch, "Sort &
 * filter", the genre chip rail, removable pills with Clear all, then the
 * infinite poster grid ending in a loading row — or the no-match / error
 * state. Everything it shows is handed in; the hub owns the data.
 */
export const AllSection = forwardRef<
  HTMLElement,
  {
    headingId: string;
    title: string;
    countLabel: string | null;
    sort: string;
    sortOptions: { value: string; label: string }[];
    onSortChange: (sort: string) => void;
    density: GridDensity;
    onDensityChange: (density: GridDensity) => void;
    activeCount: number;
    onOpenFilters: () => void;
    genres: string[];
    selectedGenre: string | undefined;
    onGenreSelect: (genre: string | undefined) => void;
    pills: ActivePill[];
    onClearAll: () => void;
    itemCount: number;
    isLoading: boolean;
    isStale: boolean;
    isError: boolean;
    onRetry: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
    loadingLabel: string;
    loadingMoreLabel: string;
    errorTitle: string;
    emptyIcon: React.ComponentType<{ className?: string; size?: number }>;
    emptyTitle: string;
    emptyBody: string;
    clearLabel: string;
    children: ReactNode;
  }
>(function AllSection(props, ref) {
  const s = useSection(shellText);
  const narrowed = props.pills.length > 0;

  return (
    <section
      ref={ref}
      id="all"
      aria-labelledby={props.headingId}
      tabIndex={-1}
      className="scroll-mt-[calc(var(--shell-bar-h,124px)+16px)] px-gutter outline-none"
    >
      <AllSectionHeader
        id={props.headingId}
        title={props.title}
        count={props.countLabel ?? <span aria-hidden>—</span>}
        tools={
          <>
            <SortSelect value={props.sort} options={props.sortOptions} onChange={props.onSortChange} />
            <DensitySwitch density={props.density} onChange={props.onDensityChange} />
            <FilterButton count={props.activeCount} onClick={props.onOpenFilters} />
          </>
        }
      />
      <GenreChipRow genres={props.genres} selected={props.selectedGenre} onSelect={props.onGenreSelect} />
      <AppliedFilters pills={props.pills} onClearAll={props.onClearAll} />

      {props.isError && props.itemCount === 0 ? (
        <ErrorState className="pt-6" title={props.errorTitle} description={s.errorBody} onRetry={props.onRetry} />
      ) : !props.isLoading && props.itemCount === 0 ? (
        <EmptyState
          icon={props.emptyIcon}
          title={props.emptyTitle}
          description={props.emptyBody}
          action={
            narrowed ? (
              <Button variant="play" size="cta" onClick={props.onClearAll}>
                {props.clearLabel}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <CardGrid
            kind={props.density === "compact" ? "posters-compact" : "posters"}
            aria-busy={props.isLoading || props.isFetchingNextPage || undefined}
            className={cn(
              "mt-[22px] transition-opacity duration-200",
              props.isStale && "opacity-60",
            )}
          >
            {props.children}
            {props.isLoading && props.itemCount === 0 && (
              <GridLoadingMore kind="poster" count={14} label={props.loadingLabel} />
            )}
            {props.isFetchingNextPage && <GridLoadingMore kind="poster" count={7} label={props.loadingMoreLabel} />}
          </CardGrid>
          <InfiniteSentinel
            hasNextPage={props.hasNextPage}
            isFetchingNextPage={props.isFetchingNextPage}
            onLoadMore={props.onLoadMore}
          />
        </>
      )}
    </section>
  );
});
