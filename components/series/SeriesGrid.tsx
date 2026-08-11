import { SeriesCard, SeriesCardSkeleton } from "./SeriesCard";
import type { SeriesListItem } from "@/types/series";

export function SeriesGrid({ series, isLoading }: { series: SeriesListItem[]; isLoading?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {isLoading
        ? Array.from({ length: 12 }).map((_, i) => <SeriesCardSkeleton key={i} className="w-full" />)
        : series.map((item) => <SeriesCard key={item.id} series={item} className="w-full" />)}
    </div>
  );
}
