"use client";

import * as React from "react";

import { BroadcastIcon, MicIcon, SparkleIcon } from "@/components/home/arcade/HomeIcons";
import { StoreGameCard } from "@/components/home/arcade/StoreGameCard";
import { StoreHeading, StoreSection } from "@/components/home/arcade/StoreSection";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/system/icons";
import { Rail } from "@/components/system/Row";
import { useLanguage } from "@/lib/context/language-context";
import { LANE_ORDER, type LaneKey } from "@/lib/home/lanes";
import { DISCOVER } from "@/lib/home/store";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { shellText } from "@/lib/i18n/sections/shell";

/**
 * DISCOVER SOMETHING NEW (Main.dc.html §6) — an edge-to-edge rail of 2:3
 * game posters, the whole shelf newest first, followed by "Soon" teaser
 * cards for every category the lane registry marks as announced (anime,
 * podcasts, live today). Shipping one of those is still a `state` flip in
 * lib/home/lanes.ts — never a layout change here.
 *
 * Scroll arrows sit in the header on desktop, fade in on hover / focus and
 * dim at the ends (never the only way through: the rail scrolls by swipe,
 * trackpad and Tab). At an end they are aria-disabled, NOT disabled, so a
 * keyboard user pressing "Scroll right" to the end keeps focus on the button.
 * Phones get no arrows.
 */
const TEASER_ICON: Partial<Record<LaneKey, typeof SparkleIcon>> = {
  anime: SparkleIcon,
  podcast: MicIcon,
  live: BroadcastIcon,
};

export function StoreDiscover() {
  const { t } = useLanguage();
  const h = useSection(homeText);
  const s = useSection(shellText);
  const teasers = LANE_ORDER.filter((lane) => lane.state === "announced");

  const railRef = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ start: true, end: false });

  const measure = React.useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  React.useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const first = requestAnimationFrame(measure);
    el.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => {
      cancelAnimationFrame(first);
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [measure]);

  const scrollBy = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <StoreSection headingId="h-discover" bleed className="group/row">
      <StoreHeading
        id="h-discover"
        className="px-gutter"
        eyebrow={t.home.store.discover.kicker}
        title={t.home.store.discover.title}
        action={
          <div className="flex gap-2 opacity-0 transition-opacity duration-200 group-focus-within/row:opacity-100 group-hover/row:opacity-100 max-desk:hidden">
            <RailArrow label={s.scrollLeft} disabled={edges.start} onClick={() => scrollBy(-1)}>
              <ChevronLeftIcon size={18} strokeWidth={2} />
            </RailArrow>
            <RailArrow label={s.scrollRight} disabled={edges.end} onClick={() => scrollBy(1)}>
              <ChevronRightIcon size={18} strokeWidth={2} />
            </RailArrow>
          </div>
        }
      />
      <Rail ref={railRef} label={t.home.store.discover.title} className="items-start">
        {DISCOVER.map((game) => (
          <StoreGameCard key={game.id} game={game} size="discover" />
        ))}
        {teasers.map((lane) => {
          const Icon = TEASER_ICON[lane.key];
          const name = t.home.lanes[lane.nameKey];
          return (
            // Announced lanes have no href by contract — the teaser is a plain
            // named group, deliberately not a disabled button pretending to be one.
            <div
              key={lane.key}
              role="group"
              aria-label={h.teaser(name)}
              className="mq-snap flex aspect-[2/3] w-[clamp(128px,12.2vw,184px)] shrink-0 flex-col items-center justify-center gap-2.5 rounded-card bg-surface"
            >
              {Icon ? (
                <Icon size={28} className="text-fg-decor" />
              ) : (
                <lane.icon aria-hidden size={28} strokeWidth={1.75} className="text-fg-decor" />
              )}
              <span className="text-card-title text-fg-muted">{name}</span>
              <span className="h-6 rounded-full bg-raised px-2.5 text-[12px] leading-6 font-bold text-fg-muted">
                {t.home.state.soon}
              </span>
            </div>
          );
        })}
      </Rail>
    </StoreSection>
  );
}

function RailArrow({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className="flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-tonal-soft text-fg transition-colors duration-150 hover:bg-tonal-hover aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-tonal-soft"
    >
      {children}
    </button>
  );
}
