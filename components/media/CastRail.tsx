"use client";

import { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/system/SectionHeader";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import type { MovieActorRef } from "@/types/movie";

/**
 * Initials for an actor with no headshot.
 *
 * Array.from rather than [0] indexing: a Burmese name is full of multi-code-unit
 * clusters, and slicing one by UTF-16 index produces a broken half-glyph.
 */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join("");
  const first = Array.from(parts[0])[0] ?? "";
  const last = Array.from(parts[parts.length - 1])[0] ?? "";
  return `${first}${last}`;
}

/**
 * THE CAST — a horizontal shelf of the people in a film.
 *
 * Portrait, and on the same grid as the title cards below it — the same
 * centred container, the same gutters, the same hover-revealed arrows — so
 * "Cast" and "More like this" still read as one page.
 *
 * But deliberately NOT the same object. A poster and a person are different
 * kinds of thing, and a rail of 2:3 poster-framed faces just reads as more
 * films. Four things pull them apart, none of which breaks the shared rhythm:
 *
 *   - 3:4 rather than 2:3 — a portrait crop, visibly squarer than a poster;
 *   - narrower cards, so more faces fit a row than titles do (you scan a cast,
 *     you browse a catalogue);
 *   - a softer, larger corner radius on a tinted plate rather than a bare
 *     edge-to-edge image;
 *   - the name CENTRED under the frame, the way a credit is set, against the
 *     poster's left-ranged title.
 */
export function CastRail({
  actors,
  className,
}: {
  actors: MovieActorRef[];
  className?: string;
}) {
  const { t } = useLanguage();
  const scroller = useRef<HTMLUListElement>(null);

  const scrollBy = (direction: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  // A film with no cast recorded shows nothing at all — an empty "Cast"
  // heading would read as missing data rather than as absent data.
  if (actors.length === 0) return null;

  return (
    <section className={cn("group/cast flex flex-col gap-3", className)}>
      <SectionHeader
        as="h2"
        kicker={t.movieDetail.castCount(actors.length)}
        title={t.movieDetail.cast}
        // Same centred container as every page section and as PosterRail —
        // this is what keeps the heading in line with the ones above it.
        className="mx-auto w-full max-w-[1600px] flex-row items-end justify-between gap-3 px-4 sm:px-6 lg:px-8"
        action={
          // Hidden until the shelf is hovered or focused, and never on touch,
          // where the rail is swiped — the same rule PosterRail follows.
          //
          // 3, not 5: the arrows only exist from `sm` up, and at 640px just
          // three 160px cards clear the 592px content box. A higher threshold
          // strands cards off-screen with no affordance — the track is
          // scrollbar-none and a cast tile holds nothing focusable.
          actors.length > 3 ? (
            <div className="hidden items-center gap-1 opacity-0 transition-opacity duration-200 ease-out group-hover/cast:opacity-100 group-focus-within/cast:opacity-100 sm:flex">
              <RailArrow
                onClick={() => scrollBy(-1)}
                label={t.browse.scrollLeft}
              >
                <ChevronLeft className="size-4" />
              </RailArrow>
              <RailArrow
                onClick={() => scrollBy(1)}
                label={t.browse.scrollRight}
              >
                <ChevronRight className="size-4" />
              </RailArrow>
            </div>
          ) : null
        }
      />

      <ul
        ref={scroller}
        className="scrollbar-none mx-auto flex w-full max-w-[1600px] snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto scroll-smooth px-4 pt-2 pb-4 sm:scroll-pl-6 sm:gap-4 sm:px-6 lg:scroll-pl-8 lg:px-8"
      >
        {actors.map((actor) => (
          <li
            key={actor.id}
            className="group/actor w-32 shrink-0 snap-start sm:w-36 lg:w-40"
          >
            <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-secondary/50 ring-1 ring-white/10 transition-[box-shadow,--tw-ring-color] duration-200 ease-out ring-inset group-hover/actor:shadow-e2 group-hover/actor:ring-white/20">
              {actor.imageUrl ? (
                <>
                  <Image
                    src={actor.imageUrl}
                    alt={actor.name}
                    fill
                    unoptimized
                    loading="lazy"
                    sizes="(max-width: 640px) 128px, (max-width: 1024px) 144px, 160px"
                    className="object-cover transition-transform duration-500 ease-out group-hover/actor:scale-[1.04]"
                  />
                  {/* A whisper of a scrim at the foot of the frame so the
                      photo settles onto the plate instead of ending on a hard
                      edge — the detail that stops these reading as posters. */}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent"
                  />
                </>
              ) : (
                <span
                  aria-hidden
                  className="font-heading flex size-full items-center justify-center text-xl font-semibold text-muted-foreground/80"
                >
                  {initials(actor.name)}
                </span>
              )}
            </div>
            {/* Centred, the way a credit is set under a portrait. */}
            <p className="mt-2 truncate px-0.5 text-center text-[13px] leading-tight font-medium text-foreground/90 sm:text-sm">
              {actor.name}
            </p>
          </li>
        ))}
      </ul>
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
