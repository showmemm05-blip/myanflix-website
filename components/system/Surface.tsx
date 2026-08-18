import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * AURORA THEATER — the standard panel.
 *
 * Every boxed thing in the app (a stat block, a form group, a rail container,
 * an empty state) is this: quiet glass, a hairline ring drawn *inside* the
 * radius so the corner never looks doubled, and an optional hover lift. The
 * artwork carries the color; chrome stays out of the way.
 *
 * It is a plain <div> by default — pass `render` nothing, just spread props;
 * for a different tag use `as`, e.g. <Surface as="section">.
 */
const surfaceVariants = cva("relative transition-[transform,background-color,box-shadow] duration-200 ease-out", {
  variants: {
    tone: {
      /** The default: glass over the page. */
      default: "bg-card/60 ring-1 ring-white/8 ring-inset backdrop-blur-xl",
      /** One step brighter — use when a panel sits on top of another panel. */
      raised: "bg-card/80 shadow-e2 ring-1 ring-white/10 ring-inset backdrop-blur-xl",
      /** Barely-there: a grouping hint rather than a box. */
      subtle: "bg-secondary/20 ring-1 ring-white/6 ring-inset",
      /** No fill at all — the ring alone. */
      outline: "ring-1 ring-white/10 ring-inset",
    },
    radius: {
      lg: "rounded-xl",
      xl: "rounded-2xl",
      "2xl": "rounded-3xl",
      /** Full-width bands (the home CTA) — one step past the panel radius. */
      "3xl": "rounded-[2rem]",
    },
    padding: {
      none: "",
      sm: "p-3.5",
      md: "p-5",
      lg: "p-6 sm:p-8",
    },
    interactive: {
      true: "hover:-translate-y-0.5 hover:bg-card/70 hover:ring-white/14",
      false: "",
    },
  },
  defaultVariants: {
    tone: "default",
    radius: "xl",
    padding: "none",
    interactive: false,
  },
});

type SurfaceProps = React.ComponentProps<"div"> &
  VariantProps<typeof surfaceVariants> & {
    /** Render as a different element — `section`, `article`, `aside`, `li`… */
    as?: React.ElementType;
  };

export function Surface({
  as: Component = "div",
  tone,
  radius,
  padding,
  interactive,
  className,
  ...props
}: SurfaceProps) {
  return (
    <Component
      data-slot="surface"
      className={cn(surfaceVariants({ tone, radius, padding, interactive }), className)}
      {...props}
    />
  );
}

export { surfaceVariants };
