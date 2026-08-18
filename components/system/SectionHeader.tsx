import * as React from "react";

import { cn } from "@/lib/utils";
import { Kicker } from "./Kicker";

/**
 * One rhythm for every section on every page: kicker · title · description on
 * the left, an optional action cluster on the right that drops below the text
 * on phones instead of squeezing it.
 *
 * Used above rails, grids, panels and page bodies alike — if a screen region
 * needs a name, it gets one of these, so the eye learns exactly one pattern.
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
  /** `page` is the big top-of-page treatment; `section` heads a rail or panel. */
  size?: "page" | "section";
}) {
  return (
    <div
      data-slot="section-header"
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6", className)}
      {...props}
    >
      <div className="min-w-0">
        {kicker && <Kicker tone={kickerTone}>{kicker}</Kicker>}
        <Heading className={cn(kicker && "mt-1.5", size === "page" ? "text-title" : "text-section-title")}>
          {title}
        </Heading>
        {description && (
          <p className={cn("text-sm text-muted-foreground", size === "page" ? "mt-2" : "mt-1")}>{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
