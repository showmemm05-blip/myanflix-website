"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { MediaCard, MediaCardSkeleton } from "@/components/system/MediaCard";
import { SectionHeader } from "@/components/system/SectionHeader";
import { useLanguage } from "@/lib/context/language-context";
import type { BrowseItem } from "./browse-item";

/**
 * A horizontal shelf of media cards, headed by the standard SectionHeader so a
 * rail sits in exactly the same rhythm as every grid and panel elsewhere.
 *
 * The arrows are desktop-only on purpose — on touch the rail is swiped, and a
 * pair of floating buttons would just cover artwork. They stay out of sight
 * until the rail is hovered or something inside it takes focus, so a page of
 * rails isn't a page of chrome.
 */
export function PosterRail({
  title,
  items,
  isLoading,
  viewAllHref,
}: {
  title: string;
  items: BrowseItem[];
  isLoading?: boolean;
  viewAllHref?: string;
}) {
  const { t } = useLanguage();
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="group/rail flex flex-col gap-3">
      <SectionHeader
        title={title}
        // A rail's heading is short and its actions are icons, so it stays one
        // row at every width instead of stacking the way body sections do.
        className="flex-row items-end justify-between gap-3 px-4 sm:px-6 lg:px-8"
        action={
          <>
            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="focus-ring rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-white/8 hover:text-foreground"
              >
                {t.browse.viewAll}
              </Link>
            )}
            <div className="hidden items-center gap-1 opacity-0 transition-opacity duration-200 ease-out group-hover/rail:opacity-100 group-focus-within/rail:opacity-100 sm:flex">
              <RailArrow onClick={() => scrollBy(-1)} label={t.browse.scrollLeft}>
                <ChevronLeft className="size-4" />
              </RailArrow>
              <RailArrow onClick={() => scrollBy(1)} label={t.browse.scrollRight}>
                <ChevronRight className="size-4" />
              </RailArrow>
            </div>
          </>
        }
      />

      <div
        ref={scroller}
        className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pt-2 pb-4 sm:px-6 lg:px-8"
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <MediaCardSkeleton key={i} className="w-72 shrink-0 sm:w-80" />
            ))
          : items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                sizes="(max-width: 640px) 78vw, 340px"
                className="w-72 shrink-0 snap-start sm:w-80"
              />
            ))}
      </div>
    </section>
  );
}

function RailArrow({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="focus-ring flex size-9 items-center justify-center rounded-full bg-white/6 text-muted-foreground ring-1 ring-white/10 backdrop-blur-md transition-colors duration-150 ease-out ring-inset hover:bg-white/12 hover:text-foreground"
    >
      {children}
    </button>
  );
}
