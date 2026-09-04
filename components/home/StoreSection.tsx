"use client";

import * as React from "react";

import { Kicker } from "@/components/system/Kicker";
import { useLanguage } from "@/lib/context/language-context";
import { headingLeading, kickerTracking } from "@/lib/home/type";
import { cn } from "@/lib/utils";

/**
 * THE PAGE'S ONE MEASURE — the app-wide container plus the app-wide gutter,
 * written once.
 *
 * It is exported as a constant as well as applied inside <StoreSection>
 * because one section deliberately lets its CONTENT run past the gutter while
 * its heading and its hairline stay on it: the Discover snap scroller carries
 * this string itself so a card can start flush with the heading above it and
 * still scroll off the right edge. That needs the literal in hand, and a
 * second hand-typed copy would drift.
 *
 * "Full bleed" on this page always means full bleed of the CONTENT COLUMN,
 * never of the viewport — AppShell adds `lg:pl-[72px]` for its rail, so a
 * 100vw element would hang off the right edge on every desktop.
 */
export const HOME_CONTAINER = "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8";

/**
 * SECTION RHYTHM, declared once and shared.
 *
 * The page root is a bare `pb-20` with no gap stack, and that is deliberate:
 * each section owns its own hairline and its own top padding, so a section
 * that resolves to nothing can return null and take its separator with it —
 * no rule left hanging above an absent block.
 */
const PAD = {
  /** The default breath between two full sections. */
  standard: "pt-10 sm:pt-14",
  /** For a section that reads as a footnote of the page — Explore More. */
  tight: "pt-8",
  none: "",
} as const;

export function StoreSection({
  as = "section",
  rule = true,
  pad = "standard",
  contain = true,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  /** `div` when the section is already wrapped in <RevealSection>, which renders its own <section>. */
  as?: "section" | "div";
  /**
   * The hero is the only section with no rule above it — it opens the page,
   * and a hairline under the AppShell top bar would read as chrome.
   */
  rule?: boolean;
  pad?: keyof typeof PAD;
  /**
   * False when the section paints its own gutters. The hairline stays inside
   * the container either way — it must run gutter to gutter and line up with
   * the text beneath it, not bleed to the edge like a settings-screen divider.
   */
  contain?: boolean;
  children?: React.ReactNode;
}) {
  const opener = cn(rule && "border-t border-white/[0.07]", PAD[pad]);

  const body = contain ? (
    <div className={HOME_CONTAINER}>
      <div className={opener}>{children}</div>
    </div>
  ) : (
    <>
      <div className={HOME_CONTAINER}>
        <div className={opener} />
      </div>
      {children}
    </>
  );

  // Written out rather than rendered through a `Tag` variable: a union element
  // type makes the prop spread's ref type ambiguous, and two lines of JSX are
  // cheaper than the cast that would silence it.
  return as === "div" ? (
    <div data-slot="store-section" className={className} {...props}>
      {body}
    </div>
  ) : (
    <section data-slot="store-section" className={className} {...props}>
      {body}
    </section>
  );
}

/**
 * Every storefront section heads itself with this pair instead of the system
 * SectionHeader, and for one reason: the Burmese inline fixes. `.text-kicker`
 * tracks 0.18em and `.text-section-title` leads tight — both right for Latin,
 * both wrong for Myanmar script, and `mm` is the DEFAULT language. Applying
 * kickerTracking()/headingLeading() here once beats remembering them in five
 * sections (a `leading-*` utility loses the cascade to the custom text
 * utilities — verified — so these must be inline styles).
 */
export function StoreHeading({
  kicker,
  title,
  id,
}: {
  kicker: string;
  title: string;
  id?: string;
}) {
  const { language } = useLanguage();
  return (
    <div>
      <Kicker style={kickerTracking(language)}>{kicker}</Kicker>
      <h2 id={id} className="text-section-title mt-1.5" style={headingLeading(language, "title")}>
        {title}
      </h2>
    </div>
  );
}
