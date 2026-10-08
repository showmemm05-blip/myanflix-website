"use client";

import type * as React from "react";

import { RevealSection } from "@/components/home/arcade/RevealSection";
import { useLanguage } from "@/lib/context/language-context";
import { headingLeading } from "@/lib/home/type";
import { cn } from "@/lib/utils";

/**
 * ONE SECTION FRAME for every storefront block after the hero
 * (Main.dc.html): the page gutter on both sides, clamp(56px, 5vw, 72px) of
 * air above (clamp(40px, 5vw, 72px) for the first one under the hero), and a
 * scroll-in rise. No hairlines and no boxed container — the Marquee page is
 * one dark ground with full-width rows.
 *
 * `bleed` drops the side gutter for a section whose content runs edge to
 * edge (the Discover rail); its header then carries the gutter itself.
 */
export function StoreSection({
  headingId,
  first = false,
  bleed = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "aria-labelledby"> & {
  /** The id of the section's h2 — the section is named by it. */
  headingId: string;
  first?: boolean;
  bleed?: boolean;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        first ? "mt-[clamp(40px,5vw,72px)]" : "mt-[clamp(56px,5vw,72px)]",
        !bleed && "px-gutter",
        className,
      )}
      {...props}
    >
      <RevealSection>{children}</RevealSection>
    </section>
  );
}

/**
 * The section header from the board: a quiet 14px eyebrow ABOVE a 22px
 * heavy h2, with an optional right-hand action (a crimson text link or the
 * rail arrows). `eyebrow` may be a node so the Live section can put its
 * beating dot in front of the word.
 *
 * Burmese gets taller line-height on the h2 (Myanmar script stacks above and
 * below the line), as the old storefront did.
 */
export function StoreHeading({
  id,
  eyebrow,
  title,
  action,
  className,
}: {
  id: string;
  eyebrow: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const { language } = useLanguage();
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm leading-5 font-semibold text-fg-faint">{eyebrow}</p>
        <h2 id={id} className="mt-0.5 text-section-title text-fg" style={headingLeading(language, "title")}>
          {title}
        </h2>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
