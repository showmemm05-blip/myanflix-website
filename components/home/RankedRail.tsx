"use client";

import { memo } from "react";
import Link from "next/link";

import { Artwork } from "@/components/system/Artwork";
import { CrownIcon } from "@/components/system/icons";
import { Row } from "@/components/system/Row";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";

/**
 * TOP 10 MOST VIEWED (HomeMovies.dc.html "Top 10 most viewed") — the website
 * build of the mobile app's RankedRail: a big outlined rank numeral tucked
 * behind each poster, in the order the server ranked them (sort=mostViewed).
 *
 * The board's cell is 150 × 160 with the 104 × 156 poster on its right and a
 * 150px numeral (ground fill, 2px decor outline) at the bottom-left; the
 * website scales the same proportions with the viewport so wide screens
 * show more cells. The numeral is decoration — the rank is spoken in the
 * card's name ("Number 3, Golden Land, Premium"). Renders nothing when empty.
 */
const RankedCell = memo(function RankedCell({ movie, rank }: { movie: Movie; rank: number }) {
  const { t } = useLanguage();
  const h = useSection(homeText);
  const premium = movie.accessType === "SUBSCRIPTION";
  return (
    <article className="group/card mq-snap relative h-[clamp(174px,16.5vw,252px)] w-[clamp(168px,15.9vw,243px)] shrink-0">
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[-2px] left-[-6px] text-[clamp(150px,14.3vw,218px)] leading-[0.79] font-black tracking-[-0.08em] text-ground [-webkit-text-stroke:2px_var(--mq-fg-decor)] select-none tabular-nums"
      >
        {rank}
      </span>
      <span className="absolute top-0 right-0 block aspect-2/3 w-[clamp(116px,11vw,168px)] overflow-hidden rounded-[10px] bg-raised">
        <Artwork src={movie.posterUrl} seed={movie.title} variant="poster" sizes="(max-width: 719px) 116px, 168px">
          <span
            aria-hidden
            className="absolute right-2 bottom-2.5 left-2 line-clamp-3 text-xs leading-[13px] font-black tracking-[-0.02em] break-words text-white uppercase"
          >
            {movie.title}
          </span>
        </Artwork>
        {premium && (
          <span
            role="img"
            aria-label={t.badges.premium}
            className="absolute top-1.5 left-1.5 flex size-[22px] items-center justify-center rounded-[6px] bg-art-badge"
          >
            <CrownIcon size={12} className="text-gold" />
          </span>
        )}
      </span>
      <Link
        href={`/movie/${movie.id}`}
        aria-label={h.rankedCard(rank, movie.title, premium)}
        className="absolute inset-0 z-[1] rounded-[10px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      />
    </article>
  );
});

export function RankedRail({
  title,
  movies,
  seeAllHref,
  className,
}: {
  title: string;
  movies: Movie[];
  seeAllHref: string;
  className?: string;
}) {
  if (movies.length === 0) return null;
  return (
    <Row title={title} seeAllHref={seeAllHref} className={className} railClassName={cn("gap-2")}>
      {movies.map((movie, i) => (
        <RankedCell key={movie.id} movie={movie} rank={i + 1} />
      ))}
    </Row>
  );
}

/** The loading look of the ranked row: ten poster-sized blocks with room for the numeral. */
export function RankedRailSkeleton({ className }: { className?: string }) {
  return (
    <div aria-busy="true" className={className}>
      <div className="px-gutter">
        <span className="mq-skeleton block h-[22px] w-[220px] rounded-[6px]" />
      </div>
      <div className="flex gap-2 overflow-hidden px-gutter pt-4">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} aria-hidden className="relative block h-[clamp(174px,16.5vw,252px)] w-[clamp(168px,15.9vw,243px)] shrink-0">
            <span className="mq-skeleton absolute top-0 right-0 block aspect-2/3 w-[clamp(116px,11vw,168px)] rounded-[10px]" />
          </span>
        ))}
      </div>
    </div>
  );
}
