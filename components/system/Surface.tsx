import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * MARQUEE PANEL — flat. No border, no shadow, no glass: a surface fill and a
 * radius. (Marquee rule: "no card borders, no card shadows".)
 *
 *   tone default  #121217 (surface) — panels, wallet tiles, settings groups
 *   tone raised   #1C1C23 (raised)  — a panel on top of a panel, rows
 *   tone subtle   #121217            — same as default (kept for older calls)
 *   tone outline  transparent with a hairline — rare grouping hint
 *
 * Radius defaults to 16 (panel). `interactive` adds the row hover (#1C1C23).
 * Use `as` for a different tag: <Surface as="section">.
 */
const surfaceVariants = cva("relative transition-colors duration-150 ease-out", {
  variants: {
    tone: {
      default: "bg-surface",
      raised: "bg-raised",
      subtle: "bg-surface",
      outline: "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
    },
    radius: {
      lg: "rounded-[12px]",
      xl: "rounded-[16px]",
      "2xl": "rounded-[20px]",
      "3xl": "rounded-[24px]",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-6 desk:p-8",
    },
    interactive: {
      true: "hover:bg-raised",
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
