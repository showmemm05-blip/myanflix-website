"use client";

import { RevealSection } from "@/components/home/RevealSection";
import { StoreGameCard } from "@/components/home/StoreGameCard";
import { HOME_CONTAINER, StoreHeading, StoreSection } from "@/components/home/StoreSection";
import { Chip } from "@/components/system/Chip";
import { useLanguage } from "@/lib/context/language-context";
import { LANE_ORDER } from "@/lib/home/lanes";
import { DISCOVER } from "@/lib/home/store";
import { cn } from "@/lib/utils";

/**
 * DISCOVER SOMETHING NEW — the whole shelf in a snap scroller, newest first,
 * with the registry's announced lanes trailing as teaser cards.
 *
 * The teasers are the extensibility promise made visible: this section renders
 * whatever `LANE_ORDER` says is announced, so shipping anime/podcasts/live is
 * a `state` flip in lib/home/lanes.ts — a registry row, never a layout change
 * here. Today that yields three teasers after twelve game cards.
 *
 * The scroller uses the HomeRacks idiom: StoreSection contain={false} keeps
 * the heading and hairline on the gutter, while the scroller carries
 * HOME_CONTAINER itself — so the first card starts flush with the heading
 * above it and still scrolls off the column edge. scroll-pl mirrors the
 * gutter at each breakpoint so a snapped card lands back on that same line.
 * Native scroll only: no arrows, no JS scroller, keyboard reaches every card
 * by tabbing through the links.
 */
export function StoreDiscover() {
  const { t } = useLanguage();
  const teasers = LANE_ORDER.filter((lane) => lane.state === "announced");

  return (
    <RevealSection y={20} amount={0.15}>
      <StoreSection as="div" pad="standard" contain={false}>
        <div className={HOME_CONTAINER}>
          <StoreHeading
            kicker={t.home.store.discover.kicker}
            title={t.home.store.discover.title}
          />
        </div>
        <div
          className={cn(
            HOME_CONTAINER,
            "mt-6 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto pb-2 scrollbar-none sm:scroll-pl-6 sm:gap-4 lg:scroll-pl-8",
          )}
        >
          {DISCOVER.map((game) => (
            <StoreGameCard key={game.id} game={game} size="discover" />
          ))}
          {teasers.map((lane) => (
            <div
              key={lane.key}
              className="w-[180px] shrink-0 cursor-default snap-start sm:w-[220px]"
            >
              {/* Announced lanes have href null by contract — the teaser is a
                  plain div, deliberately not a disabled button pretending to
                  be one. The dimmed plate + "Soon" chip say everything. */}
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-card/30 ring-1 ring-white/10 ring-inset">
                <div aria-hidden className="aurora-wash-soft absolute inset-0 opacity-30" />
                <lane.icon aria-hidden className="size-6 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-muted-foreground">
                  {t.home.lanes[lane.nameKey]}
                </span>
                <Chip size="sm" tone="neutral">
                  {t.home.state.soon}
                </Chip>
              </div>
            </div>
          ))}
        </div>
      </StoreSection>
    </RevealSection>
  );
}
