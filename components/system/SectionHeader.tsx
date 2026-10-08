import * as React from "react";

import { cn } from "@/lib/utils";
import { Kicker } from "./Kicker";

/**
 * One header rhythm for every page and panel: optional overline · title ·
 * description on the left, an action cluster on the right that drops below
 * the text on phones instead of squeezing it.
 *
 *   size="page"     H1 — clamp(28px, 2.8vw, 40px) / 1.15 · 900 · −0.03em
 *   size="section"  22/28 · 800 · −0.01em (rows, panels, dialog titles)
 */
export function SectionHeader({
  kicker,
  kickerTone,
  title,
  description,
  action,
  as: Heading = "h2",
  size = "section",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title" | "children"> & {
  kicker?: string;
  kickerTone?: React.ComponentProps<typeof Kicker>["tone"];
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: "page" | "section";
}) {
  return (
    <div
      data-slot="section-header"
      className={cn("flex flex-col gap-3 desk:flex-row desk:items-end desk:justify-between desk:gap-6", className)}
      {...props}
    >
      <div className="min-w-0">
        {kicker && <Kicker tone={kickerTone}>{kicker}</Kicker>}
        <Heading className={cn("text-fg", kicker && "mt-2", size === "page" ? "text-title" : "text-section-title")}>
          {title}
        </Heading>
        {description && (
          <p
            className={cn(
              size === "page" ? "mt-2 text-base leading-6 text-fg-muted" : "mt-0.5 text-sm leading-5 text-fg-faint",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div>}
    </div>
  );
}
