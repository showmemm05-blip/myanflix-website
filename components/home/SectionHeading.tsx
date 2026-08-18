import type { ReactNode } from "react";

import { SectionHeader } from "@/components/system/SectionHeader";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * The home page's section heading is the app-wide SectionHeader with the page
 * gutter baked in — the marketing sections are full-bleed, so each one pads
 * its own heading rather than sitting inside a padded column.
 *
 * Kept as its own component (rather than every section importing SectionHeader
 * directly) so the gutter is declared once and the whole page keeps one rhythm.
 *
 * The gutter is the ONLY thing it adds: it runs at the shared `section` scale,
 * because a section on the home page is the same rank as a section anywhere
 * else and a second, larger type scale just for this page made the app read as
 * two products.
 */
export function SectionHeading({ eyebrow, title, subtitle, action, className }: SectionHeadingProps) {
  return (
    <SectionHeader
      kicker={eyebrow}
      title={title}
      description={subtitle}
      action={action}
      className={cn("px-4 sm:px-6 lg:px-8", className)}
    />
  );
}
