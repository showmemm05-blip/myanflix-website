"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SectionHeader } from "@/components/system/SectionHeader";
import { useLanguage } from "@/lib/context/language-context";

/**
 * The All-page shelf: one horizontal scroller that doesn't care what kind of
 * card is on it — movies, books and albums each bring their own card and their
 * own width, this only provides the header rhythm (kicker = the medium, title
 * = the editorial angle, "View all" = the category page), the snap scrolling
 * and the desktop hover arrows.
 *
 * This is the allowed kind of sharing between the three media types: the
 * shelf is common, the objects on it are not.
 */
export function MediaRail({
  kicker,
  title,
  viewAllHref,
  children,
}: {
  kicker: string;
  title: string;
  viewAllHref: string;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="group/rail flex flex-col gap-3">
      <SectionHeader
        kicker={kicker}
        title={title}
        className="flex-row items-end justify-between gap-3 px-4 sm:px-6 lg:px-8"
        action={
          <>
            <Link
              href={viewAllHref}
              className="focus-ring rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-white/8 hover:text-foreground"
            >
              {t.browse.viewAll}
            </Link>
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
        className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pt-1 pb-3 sm:px-6 lg:px-8"
      >
        {children}
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
  children: ReactNode;
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
