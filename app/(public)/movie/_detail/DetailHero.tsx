"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import { Artwork, ChevronDownIcon, ChevronLeftIcon, filterChipClass } from "@/components/system";
import { useTopBarOverHero } from "@/components/layout/shell-context";
import { useSection } from "@/lib/i18n/sections/define";
import { titlesText } from "@/lib/i18n/sections/titles";
import { cn } from "@/lib/utils";

/**
 * THE TITLE-PAGE HERO (MovieDetail / SeriesDetail / BookDetail boards).
 *
 * Full-bleed art pulled up under the top bar, the system's three scrims, a
 * quiet "Back to …" link under the bar, and the copy block bottom-left on
 * the gutter (max 680px). Unlike the hub <HeroShell> it has a MIN height
 * (clamp 560–640) instead of a fixed one: a title page's copy carries chips,
 * a three-line synopsis, a wrapping button row and a progress line, and on a
 * phone that has to push the hero taller rather than be clipped.
 *
 * `backdrop` replaces the default art (the book page blurs its cover).
 */
export function DetailHero({
  imageUrl,
  seed,
  backdrop,
  backHref,
  backLabel,
  titleId,
  className,
  copyClassName,
  children,
}: {
  imageUrl?: string | null;
  seed: string;
  backdrop?: ReactNode;
  backHref: string;
  backLabel: string;
  /** id of the h1 inside — the section is labelled by it. */
  titleId: string;
  className?: string;
  /** Overrides the copy block's 680px cap (the book page lays a cover beside its copy). */
  copyClassName?: string;
  children: ReactNode;
}) {
  useTopBarOverHero(true);

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "under-bar relative isolate flex min-h-[clamp(560px,44vw,640px)] flex-col justify-end overflow-hidden px-gutter pt-[calc(var(--shell-bar-h)+60px)] pb-[clamp(40px,4.4vw,64px)]",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0 -z-10 bg-ground">
        <div className="mq-settle absolute inset-0">
          {backdrop ?? (
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
        <div className="absolute inset-0" style={{ background: "var(--mq-scrim-left)" }} />
        <div className="absolute inset-x-0 top-0 h-[220px]" style={{ background: "var(--mq-scrim-top)" }} />
        <div className="absolute inset-x-0 bottom-0 h-[46%]" style={{ background: "var(--mq-scrim-bottom)" }} />
      </div>

      <Link
        href={backHref}
        className="absolute top-[calc(var(--shell-bar-h)+16px)] left-gutter z-[1] inline-flex h-8 items-center gap-1.5 rounded-[6px] text-sm font-bold text-fg-body transition-colors outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      >
        <ChevronLeftIcon size={16} strokeWidth={2} />
        {backLabel}
      </Link>

      <div className={cn("mq-rise relative max-w-[680px]", copyClassName)}>{children}</div>
    </section>
  );
}

/** The genre / category chips under the meta line. Links when an href is given, plain chips otherwise. */
export function HeroChips({
  label,
  chips,
}: {
  label: string;
  chips: { key: string; label: string; href?: string }[];
}) {
  if (chips.length === 0) return null;
  const cls = cn(filterChipClass({ onArt: true }), "h-8 px-3.5");
  return (
    <ul aria-label={label} className="mt-4 flex list-none flex-wrap gap-2 p-0">
      {chips.map((chip) => (
        <li key={chip.key}>
          {chip.href ? (
            <Link href={chip.href} className={cls}>
              {chip.label}
            </Link>
          ) : (
            <span className="on-art inline-flex h-8 items-center rounded-full px-3.5 text-sm font-bold whitespace-nowrap text-fg">
              {chip.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The synopsis: 17/27 body colour, three lines with a More / Less toggle.
 * The toggle only appears when the text is actually cut off (measured, so a
 * short synopsis never offers a "More" that reveals nothing).
 */
export function HeroSynopsisToggle({ children, className }: { children: string; className?: string }) {
  const s = useSection(titlesText);
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      // While open the text is never cut, so keep the last closed answer.
      if (!expanded) setCanExpand(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, expanded]);

  return (
    <>
      <p
        ref={ref}
        id={id}
        className={cn(
          "mt-3.5 max-w-[60ch] text-[17px] leading-[27px] whitespace-pre-line text-fg-body max-desk:text-[15px] max-desk:leading-6",
          !expanded && "line-clamp-3",
          className,
        )}
      >
        {children}
      </p>
      {(canExpand || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((open) => !open)}
          className="mt-1 inline-flex h-7 cursor-pointer items-center gap-1 rounded-[6px] border-0 bg-transparent p-0 text-[15px] font-bold text-fg outline-none hover:text-fg-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
        >
          {expanded ? s.less : s.more}
          <ChevronDownIcon
            size={16}
            strokeWidth={2.2}
            className={cn("transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>
      )}
    </>
  );
}

/** The watched / read line under the buttons: a 4px track (max 440px) and a caption. */
export function HeroProgress({
  percent,
  label,
  caption,
}: {
  percent: number;
  /** What the bar measures, for screen readers ("Watched", "Read"). */
  label: string;
  caption: ReactNode;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="mt-[18px] flex max-w-[440px] items-center gap-3">
      <span
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="block h-1 flex-1 overflow-hidden rounded-[2px] bg-white/25"
      >
        <span className="block h-1 rounded-[2px] bg-crimson" style={{ width: `${value}%` }} />
      </span>
      <span className="shrink-0 text-sm leading-5 text-fg-body tabular-nums">{caption}</span>
    </div>
  );
}
