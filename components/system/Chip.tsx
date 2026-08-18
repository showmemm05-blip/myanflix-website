import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * THE PILL — filters, metadata, statuses, counts. One shape, one set of role
 * colors, everywhere.
 *
 * The idiom is the one the semantic color system already shipped with:
 * `bg-<role>/15 text-<role>`, plus an inset ring when outlined, and a solid
 * fill when the chip is the loud one in the room (selected filters, the single
 * status that matters). `mono` is the deliberate monochrome tone used by the
 * genre chips — idle is grey glass, selected is a white pill.
 *
 * Class strings are spelled out in full: Tailwind only compiles literals.
 */
export type ChipTone =
  | "neutral"
  | "mono"
  | "primary"
  | "premium"
  | "finance"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "brand";

export type ChipVariant = "soft" | "outline" | "solid";

const TONES: Record<ChipTone, { soft: string; ring: string; solid: string }> = {
  neutral: {
    soft: "bg-white/8 text-muted-foreground",
    ring: "ring-1 ring-white/12 ring-inset",
    solid: "bg-white/90 text-black",
  },
  mono: {
    soft: "bg-white/8 text-muted-foreground hover:text-foreground",
    ring: "ring-1 ring-white/12 ring-inset",
    solid: "bg-white text-black",
  },
  primary: {
    soft: "bg-primary/15 text-primary",
    ring: "ring-1 ring-primary/25 ring-inset",
    solid: "bg-primary text-primary-foreground",
  },
  premium: {
    soft: "bg-premium/15 text-premium",
    ring: "ring-1 ring-premium/25 ring-inset",
    solid: "bg-premium text-premium-foreground",
  },
  finance: {
    soft: "bg-finance/15 text-finance",
    ring: "ring-1 ring-finance/25 ring-inset",
    solid: "bg-finance text-finance-foreground",
  },
  success: {
    soft: "bg-success/15 text-success",
    ring: "ring-1 ring-success/25 ring-inset",
    solid: "bg-success text-black",
  },
  warning: {
    soft: "bg-warning/15 text-warning",
    ring: "ring-1 ring-warning/25 ring-inset",
    solid: "bg-warning text-black",
  },
  destructive: {
    soft: "bg-destructive/15 text-destructive",
    ring: "ring-1 ring-destructive/25 ring-inset",
    solid: "bg-destructive text-white",
  },
  info: {
    soft: "bg-info/15 text-info",
    ring: "ring-1 ring-info/25 ring-inset",
    solid: "bg-info text-info-foreground",
  },
  brand: {
    soft: "bg-brand/15 text-brand",
    ring: "ring-1 ring-brand/25 ring-inset",
    solid: "bg-brand text-brand-foreground",
  },
};

const SIZES = {
  /** Dense metadata — inside cards and rows. */
  sm: "h-6 gap-1 px-2 text-[11px] [&_svg]:size-3",
  /** The default pill. */
  md: "h-7 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5",
  /** Tap-target sized — filter bars and anything a thumb must hit. */
  lg: "h-10 gap-2 px-4 text-sm [&_svg]:size-4",
} as const;

export interface ChipOptions {
  tone?: ChipTone;
  variant?: ChipVariant;
  size?: keyof typeof SIZES;
  /** Selected filter chips take the tone's solid fill. */
  selected?: boolean;
}

/**
 * The class string on its own — for chips that need to be a <button>, an <a>,
 * or a base-ui trigger rather than the plain <span> below.
 */
export function chipClass({ tone = "neutral", variant = "soft", size = "md", selected = false }: ChipOptions = {}) {
  const t = TONES[tone];
  const resolved = selected ? "solid" : variant;
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:shrink-0",
    SIZES[size],
    resolved === "solid" ? t.solid : t.soft,
    resolved === "outline" && t.ring,
  );
}

export function Chip({
  tone,
  variant,
  size,
  selected,
  className,
  ...props
}: React.ComponentProps<"span"> & ChipOptions) {
  return (
    <span
      data-slot="chip"
      className={cn(chipClass({ tone, variant, size, selected }), className)}
      {...props}
    />
  );
}
