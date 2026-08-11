"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronRight as ArrowRight } from "lucide-react";
import { SeriesCard, SeriesCardSkeleton } from "./SeriesCard";
import { Button } from "@/components/ui/button";
import type { SeriesListItem } from "@/types/series";

interface SeriesRowProps {
  title: string;
  series: SeriesListItem[];
  isLoading?: boolean;
  viewAllHref?: string;
}

export function SeriesRow({ title, series, isLoading, viewAllHref }: SeriesRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (!isLoading && series.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
        <div className="flex items-center gap-1.5">
          {viewAllHref && (
            <Button variant="ghost" size="sm" render={<Link href={viewAllHref} />} nativeButton={false}>
              View all
              <ArrowRight className="size-3.5" />
            </Button>
          )}
          <div className="hidden items-center gap-1 sm:flex">
            <Button variant="outline" size="icon-sm" onClick={() => scroll("left")} aria-label="Scroll left">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => scroll("right")} aria-label="Scroll right">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-none flex gap-3 overflow-x-auto scroll-smooth px-4 pb-1 sm:px-6 lg:px-8"
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SeriesCardSkeleton key={i} />)
          : series.map((item) => <SeriesCard key={item.id} series={item} />)}
      </div>
    </section>
  );
}
