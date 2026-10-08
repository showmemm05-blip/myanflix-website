"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

import { useTopBarOverHero } from "@/components/layout/shell-context";
import { cn } from "@/lib/utils";
import { Artwork } from "./Artwork";

/**
 * THE MARQUEE HERO (SHELL.md §17, Media.dc.html).
 *
 * Full-bleed art under the top bar, with the system's only three gradients:
 * a left scrim (behind the copy), a top scrim (behind the bar) and a bottom
 * scrim that melts into the ground. The copy block sits bottom-left on the
 * gutter, at most 640px wide.
 *
 *   <HeroShell size="hub" imageUrl={m.coverUrl} seed={m.title} artKey={m.id} label="Featured">
 *     <HeroTags>…<Tag kind="new">NEW</Tag>…</HeroTags>
 *     <HeroTitle>{m.title}</HeroTitle>
 *     <HeroMeta>…</HeroMeta>
 *     <HeroSynopsis>{m.description}</HeroSynopsis>
 *     <HeroActions>…Play / My List / More info…</HeroActions>
 *     <HeroPager … />
 *   </HeroShell>
 *
 * - size "hub" = clamp(600px, 56vw, 820px); "detail" = clamp(480px, 44vw, 640px).
 * - It pulls itself up under the bar (and the Media chip strip) and tells the
 *   shell to keep the bar transparent until 150px of scroll. Pass
 *   `underBar={false}` for a hero that sits lower on the page.
 * - `artKey` re-runs the art's settle-in (1.06 → 1) and the copy's rise when
 *   the featured title changes.
 * - `art` replaces the image entirely (e.g. a trailer); otherwise `imageUrl`
 *   with the fallback scene from `seed`.
 */
export function HeroShell({
  size = "hub",
  imageUrl,
  seed,
  art,
  artKey,
  label,
  carousel = false,
  underBar = true,
  className,
  copyClassName,
  children,
}: {
  size?: "hub" | "detail";
  imageUrl?: string | null;
  /** Fallback-scene seed — usually the title. */
  seed: string;
  art?: ReactNode;
  artKey?: string;
  /** Accessible name of the hero region ("Featured", the title…). */
  label: string;
  /** Adds aria-roledescription="carousel" for rotating heroes. */
  carousel?: boolean;
  underBar?: boolean;
  className?: string;
  copyClassName?: string;
  children: ReactNode;
}) {
  useTopBarOverHero(underBar);

  return (
    <section
      aria-label={label}
      aria-roledescription={carousel ? "carousel" : undefined}
      className={cn(
        "group/hero relative isolate overflow-hidden bg-ground",
        size === "hub" ? "h-[clamp(600px,56vw,820px)]" : "h-[clamp(480px,44vw,640px)]",
        underBar && "under-bar",
        className,
      )}
    >
      <div key={artKey} aria-hidden className="mq-settle absolute inset-0">
        {art ?? (
          <Artwork
            src={imageUrl}
            seed={seed}
            variant="hero"
            sizes="100vw"
            priority
            zoomOnHover={false}
            className="object-[70%_center]"
          />
        )}
      </div>
      <div aria-hidden className="absolute inset-0" style={{ background: "var(--mq-scrim-left)" }} />
      <div aria-hidden className="absolute inset-x-0 top-0 h-[220px]" style={{ background: "var(--mq-scrim-top)" }} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[46%]" style={{ background: "var(--mq-scrim-bottom)" }} />

      <div
        key={artKey ? `copy-${artKey}` : undefined}
        className={cn(
          "mq-rise absolute bottom-[clamp(40px,5vw,80px)] left-gutter right-[45%] max-w-[640px] max-desk:right-gutter",
          copyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** The tag row above the title (NEW / PREMIUM / FREE + a kicker line). */
export function HeroTags({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

/** Display title: clamp(40px, 4.4vw, 64px) / 1.02 · 900 · −0.035em. */
export function HeroTitle({
  as: Heading = "h1",
  className,
  children,
}: {
  as?: "h1" | "h2";
  className?: string;
  children: ReactNode;
}) {
  return <Heading className={cn("mt-3.5 text-display text-fg text-balance", className)}>{children}</Heading>;
}

/** The meta line: 15/22 body colour, tabular numbers, items spaced 12px. */
export function HeroMeta({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn("mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] leading-[22px] text-fg-body tabular-nums", className)}>
      {children}
    </p>
  );
}

/** Synopsis: 17/27, two lines at most, 56ch. */
export function HeroSynopsis({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn("mt-3 line-clamp-2 max-w-[56ch] text-[17px] leading-[27px] text-fg-body max-desk:text-[15px] max-desk:leading-6", className)}>
      {children}
    </p>
  );
}

/** The button row, 26px under the copy. One white Play per screen. */
export function HeroActions({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mt-[26px] flex flex-wrap gap-3", className)}>{children}</div>;
}

/**
 * THE STORY PAGER — 3px segments under the hero copy (max 400px wide). Done
 * segments are white, the active one fills crimson over `durationMs` (8s)
 * and pauses while the pointer is over the hero or focus is inside it; when
 * the fill ends it calls `onAdvance`. Clicking a segment jumps there; ←/→
 * move between segments.
 *
 * Reduced motion: no fill animation and no auto-advance — the active segment
 * is simply solid, and the viewer moves on with the segments.
 */
export function HeroPager({
  count,
  index,
  onSelect,
  onAdvance,
  label,
  itemLabel,
  durationMs = 8000,
  paused = false,
  className,
}: {
  count: number;
  index: number;
  onSelect: (index: number) => void;
  /** Called when the active segment finishes filling. */
  onAdvance?: () => void;
  /** Name of the tab list ("Featured movies"). */
  label: string;
  /** Spoken name of each segment, e.g. (i) => shellText.slideOf(title, i + 1, count). */
  itemLabel: (index: number) => string;
  durationMs?: number;
  /** Extra pause (e.g. a dialog is open over the hero). */
  paused?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + count) % count;
    onSelect(next);
    refs.current[next]?.focus();
  };

  if (count < 2) return null;

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("mt-7 grid max-w-[400px] gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }, (_, i) => {
        const active = i === index;
        return (
          <button
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={itemLabel(i)}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(i)}
            onKeyDown={onKeyDown}
            className="flex h-6 cursor-pointer items-center border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
          >
            <span className="relative block h-[3px] w-full overflow-hidden rounded-[2px] bg-white/22">
              {i < index && <span className="absolute inset-0 bg-white" />}
              {active &&
                (reduce ? (
                  <span className="absolute inset-0 bg-crimson" />
                ) : (
                  <span
                    key={`${index}-${count}`}
                    className={cn(
                      "absolute inset-y-0 left-0 bg-crimson group-focus-within/hero:[animation-play-state:paused] group-hover/hero:[animation-play-state:paused]",
                      paused && "[animation-play-state:paused]",
                    )}
                    // Longhands, not the `animation` shorthand: the shorthand
                    // would reset animation-play-state inline and beat the
                    // pause-on-hover classes above.
                    style={{
                      animationName: "mq-fill",
                      animationDuration: `${durationMs}ms`,
                      animationTimingFunction: "linear",
                      animationFillMode: "both",
                    }}
                    onAnimationEnd={() => onAdvance?.()}
                  />
                ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
