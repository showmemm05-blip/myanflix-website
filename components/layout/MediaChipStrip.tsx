"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ChevronDownIcon, ChevronUpIcon } from "@/components/system/icons";
import { isActiveHref } from "@/components/system/nav";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";

/**
 * THE MEDIA CHIP STRIP (SHELL.md §4) — 52px, inside the sticky top-bar
 * wrapper, on every /media page: Movies · Series · Books · Categories |
 * Music SOON. The selected chip is white (aria-current="page"); the others
 * are translucent so they read over the hero art.
 *
 * Where each chip goes is this one table. Categories opens the Categories
 * overlay through the URL, so the media pages decide what the overlay looks
 * like and Back closes it: on a page that has the overlay (the Movies and
 * Series hubs, the Books hub, a genre / category page) the chip adds
 * `?categories=<that page's type>` to the page itself, so the pop-up opens
 * over it on Movies, Series or Books; anywhere else it is the static
 * `/media?categories=1` (the Movies hub, Movies list).
 */
export type MediaChip = "movies" | "series" | "books" | "categories" | "music";

export const MEDIA_CHIP_HREF: Record<MediaChip, string> = {
  movies: "/media",
  // `tab=series` is the spelling the catalog writes back to the address bar,
  // so the chip stays selected after the catalog's own URL sync.
  series: "/media/movies?tab=series",
  books: "/media/books",
  categories: "/media?categories=1",
  music: "/media/music",
};

/**
 * Where the Categories chip goes from this page: the same page with
 * `categories=<its type>` added (every other parameter kept), or the static
 * href from a page without the overlay.
 */
export function categoriesChipHref(pathname: string, params: URLSearchParams | null): string {
  let kind: "movies" | "series" | "books";
  if (isActiveHref(pathname, "/media/books")) {
    kind = "books";
  } else if (isActiveHref(pathname, "/media/genre")) {
    kind = params?.get("type") === "series" ? "series" : "movies";
  } else if (pathname === "/media" || isActiveHref(pathname, "/media/movies")) {
    const tab = params?.get("tab") ?? null;
    kind = tab === "series" || (tab === null && params?.get("type") === "series") ? "series" : "movies";
  } else {
    return MEDIA_CHIP_HREF.categories;
  }
  const next = new URLSearchParams(params?.toString() ?? "");
  next.set("categories", kind);
  return `${pathname}?${next.toString()}`;
}

/** Which chip a /media URL selects. */
export function activeMediaChip(pathname: string, params: URLSearchParams | null): MediaChip {
  if (isActiveHref(pathname, "/media/music")) return "music";
  // An open Categories pop-up selects its chip on every page, the Books hub
  // included (so the chip shows its up-arrow while the pop-up is open).
  if (
    params?.has("categories") ||
    isActiveHref(pathname, "/media/categories") ||
    isActiveHref(pathname, "/media/genre")
  ) {
    return "categories";
  }
  if (isActiveHref(pathname, "/media/books")) return "books";
  // The catalog rewrites the old `?type=series` to `?tab=series` on mount and
  // whenever its own Movies | Series tabs switch, so `tab` decides; `type`
  // only counts while no `tab` is in the URL yet (old deep links).
  const tab = params?.get("tab") ?? null;
  if (
    tab === "series" ||
    (tab === null && params?.get("type") === "series") ||
    isActiveHref(pathname, "/media/series")
  ) {
    return "series";
  }
  return "movies";
}

export function MediaChipStrip() {
  const pathname = usePathname();
  return (
    // useSearchParams needs a Suspense boundary to keep the routes static;
    // the fallback picks the chip from the path alone.
    <Suspense fallback={<Strip pathname={pathname} params={null} />}>
      <StripFromUrl />
    </Suspense>
  );
}

function StripFromUrl() {
  const pathname = usePathname();
  const params = useSearchParams();
  return <Strip pathname={pathname} params={new URLSearchParams(params?.toString() ?? "")} />;
}

function Strip({ pathname, params }: { pathname: string; params: URLSearchParams | null }) {
  const { t } = useLanguage();
  const s = useSection(shellText);
  const active = activeMediaChip(pathname, params);
  const categoriesHref = categoriesChipHref(pathname, params);

  const chip = (key: MediaChip) =>
    cn(
      "mq-snap inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm whitespace-nowrap outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
      key === active ? "bg-play font-extrabold text-ink hover:text-ink" : "on-art font-bold text-fg hover:bg-white/24 hover:text-fg",
    );
  const current = (key: MediaChip) => (key === active ? ("page" as const) : undefined);

  return (
    <nav
      aria-label={s.mediaSections}
      className="mq-rail flex h-[52px] items-center gap-2 overflow-x-auto px-gutter pb-2"
    >
      <Link href={MEDIA_CHIP_HREF.movies} aria-current={current("movies")} className={chip("movies")}>
        {t.nav.movies}
      </Link>
      <Link href={MEDIA_CHIP_HREF.series} aria-current={current("series")} className={chip("series")}>
        {t.nav.series}
      </Link>
      <Link href={MEDIA_CHIP_HREF.books} aria-current={current("books")} className={chip("books")}>
        {t.search.books}
      </Link>
      <Link
        href={categoriesHref}
        // Opening the pop-up over the same page keeps the page where it was.
        scroll={categoriesHref.startsWith(`${pathname}?`) ? false : undefined}
        aria-current={current("categories")}
        className={cn(chip("categories"), "gap-1.5 pr-3")}
      >
        {t.nav.categories}
        {active === "categories" ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
      </Link>
      <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-white/24" />
      <Link
        href={MEDIA_CHIP_HREF.music}
        aria-current={current("music")}
        aria-label={active === "music" ? undefined : s.musicSoon}
        className={cn(chip("music"), "gap-2 pr-2.5")}
      >
        {t.search.music}
        <span
          className={cn(
            "h-[18px] rounded-[9px] px-1.5 text-[10px] leading-[18px] font-extrabold tracking-[0.06em] [&:lang(my)]:tracking-normal",
            active === "music" ? "bg-ink/12" : "bg-white/18",
          )}
        >
          {s.soon}
        </span>
      </Link>
    </nav>
  );
}
