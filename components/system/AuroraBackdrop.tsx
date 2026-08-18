import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * THE SIGNATURE AMBIENT EFFECT — a soft violet→sky wash that makes the top of
 * a page feel lit rather than painted.
 *
 * Purely decorative: `aria-hidden`, `pointer-events-none`, and always behind
 * content (negative z-index within its own stacking context). Use it sparingly
 * — page tops, hero edges, empty states — and never directly behind body text.
 *
 * `variant` picks the shape of the light:
 *  - `page`  full-bleed glow across the top of a route
 *  - `hero`  denser, taller, meant to bleed off a hero's edges
 *  - `panel` a contained blush inside a Surface/empty state
 */
export function AuroraBackdrop({
  variant = "page",
  className,
  ...props
}: React.ComponentProps<"div"> & { variant?: "page" | "hero" | "panel" }) {
  return (
    <div
      aria-hidden
      data-slot="aurora-backdrop"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden select-none",
        variant === "page" && "h-[420px]",
        variant === "hero" && "h-[620px]",
        variant === "panel" && "inset-0 h-full rounded-[inherit]",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "absolute inset-0",
          variant === "panel" ? "aurora-wash-soft opacity-50 blur-2xl" : "aurora-wash blur-3xl",
          variant === "hero" && "opacity-90",
        )}
      />
      {/* Fades the wash into the page instead of ending on a hard edge. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
