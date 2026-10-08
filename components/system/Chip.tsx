import * as React from "react";

import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon, CloseIcon } from "./icons";

/**
 * MARQUEE CHIPS (DesignSystem "Chips, segments, tags", SHELL.md §13).
 *
 * - <FilterChip>     36px pill. Selected = white with ink text (800);
 *                    idle = raised #1C1C23 (600), hover #26262F. `onArt`
 *                    gives the translucent chip used over artwork. `check`
 *                    shows a tick on selected multi-select chips.
 * - <RemovableChip>  crimson-soft applied-filter pill with an × ("Remove
 *                    filter: Premium").
 * - chipClass()/<Chip> the older tone/variant API, restyled — kept so pages
 *                    not rebuilt yet still compile and look right.
 */

/* ── Legacy API, restyled ─────────────────────────────────────────────── */

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
    soft: "bg-tonal-faint text-fg-muted",
    ring: "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] bg-transparent text-fg-body",
    solid: "bg-play text-ink",
  },
  mono: {
    soft: "bg-raised text-fg hover:bg-raised-hover",
    ring: "",
    solid: "bg-play text-ink",
  },
  primary: {
    soft: "bg-crimson-soft text-fg",
    ring: "shadow-[inset_0_0_0_1px_rgba(255,77,85,0.4)]",
    solid: "bg-crimson text-white",
  },
  premium: {
    soft: "bg-gold/16 text-gold",
    ring: "shadow-[inset_0_0_0_1px_rgba(245,196,81,0.35)]",
    solid: "bg-gold text-gold-ink",
  },
  finance: {
    soft: "bg-money/16 text-money",
    ring: "shadow-[inset_0_0_0_1px_rgba(47,208,126,0.35)]",
    solid: "bg-money text-ink",
  },
  success: {
    soft: "bg-money/16 text-money",
    ring: "shadow-[inset_0_0_0_1px_rgba(47,208,126,0.35)]",
    solid: "bg-money text-ink",
  },
  warning: {
    soft: "bg-pending/16 text-pending",
    ring: "shadow-[inset_0_0_0_1px_rgba(245,165,36,0.35)]",
    solid: "bg-pending text-ink",
  },
  destructive: {
    soft: "bg-danger/16 text-danger",
    ring: "shadow-[inset_0_0_0_1px_rgba(255,90,95,0.35)]",
    solid: "bg-danger-fill text-white",
  },
  info: {
    soft: "bg-info/16 text-info",
    ring: "shadow-[inset_0_0_0_1px_rgba(77,179,255,0.35)]",
    solid: "bg-info text-ink",
  },
  brand: {
    soft: "bg-crimson-soft text-fg",
    ring: "shadow-[inset_0_0_0_1px_rgba(255,77,85,0.4)]",
    solid: "bg-crimson text-white",
  },
};

const SIZES = {
  /** Tag: 22px, radius 4, 11px heavy caps — on art and in meta lines. */
  sm: "h-[22px] gap-1 rounded-[4px] px-[7px] text-[11px] font-extrabold tracking-[0.06em] [&_svg]:size-[11px]",
  /** A small pill. */
  md: "h-7 gap-1.5 rounded-full px-3 text-xs font-bold [&_svg]:size-3.5",
  /** The 36px chip — filter bars and anything a thumb must hit. */
  lg: "h-9 gap-1.5 rounded-full px-4 text-sm font-semibold [&_svg]:size-4",
} as const;

export interface ChipOptions {
  tone?: ChipTone;
  variant?: ChipVariant;
  size?: keyof typeof SIZES;
  /** Selected filter chips take the tone's solid fill. */
  selected?: boolean;
}

/** The class string on its own — for chips that need to be a <button>, an <a> or a base-ui trigger. */
export function chipClass({ tone = "neutral", variant = "soft", size = "md", selected = false }: ChipOptions = {}) {
  const t = TONES[tone];
  const resolved = selected ? "solid" : variant;
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-colors duration-150 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link [&_svg]:shrink-0",
    SIZES[size],
    resolved === "solid" ? t.solid : resolved === "outline" ? cn(t.soft, t.ring) : t.soft,
    selected && "font-extrabold",
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
  return <span data-slot="chip" className={cn(chipClass({ tone, variant, size, selected }), className)} {...props} />;
}

/* ── Marquee chips ────────────────────────────────────────────────────── */

export function filterChipClass({
  selected = false,
  onArt = false,
  size = "md",
}: {
  selected?: boolean;
  onArt?: boolean;
  /** md = 36px (default), sm = 34px (phone sheets). */
  size?: "md" | "sm";
} = {}) {
  return cn(
    "mq-snap inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border-0 px-4 text-sm whitespace-nowrap transition-colors duration-150 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:shrink-0",
    size === "sm" ? "h-[34px] px-3.5" : "h-9",
    selected
      ? "bg-play font-extrabold text-ink"
      : onArt
        ? "on-art font-bold text-fg hover:bg-white/24"
        : "bg-raised font-semibold text-fg hover:bg-raised-hover",
  );
}

/**
 * One filter/scope chip. Renders a <button aria-pressed>. For a chip that
 * navigates, use `filterChipClass()` on a <Link> with aria-current="page".
 */
export function FilterChip({
  selected = false,
  onArt = false,
  check = false,
  dropdown = false,
  size,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "type"> & {
  selected?: boolean;
  onArt?: boolean;
  /** Multi-select: show a tick while selected. */
  check?: boolean;
  /** Opens a menu/listbox: shows a chevron (set aria-haspopup yourself). */
  dropdown?: boolean;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      aria-pressed={dropdown ? undefined : selected}
      className={cn(
        filterChipClass({ selected, onArt, size }),
        check && selected && "pl-3",
        dropdown && "pr-3",
        className,
      )}
      {...props}
    >
      {check && selected && <CheckIcon size={16} />}
      {children}
      {dropdown && <ChevronDownIcon size={14} />}
    </button>
  );
}

/** The applied-filter pill: crimson-soft, with an ×. Its accessible name is "Remove filter: {label}". */
export function RemovableChip({
  label,
  onRemove,
  className,
}: {
  label: string;
  onRemove: () => void;
  className?: string;
}) {
  const s = useSection(shellText);
  return (
    <button
      type="button"
      aria-label={s.removeFilter(label)}
      onClick={onRemove}
      className={cn(
        "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-crimson-soft pr-2.5 pl-3.5 text-sm font-bold whitespace-nowrap text-fg transition-colors duration-150 ease-out outline-none hover:bg-crimson/24 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
        className,
      )}
    >
      {label}
      <CloseIcon size={14} strokeWidth={2.2} className="text-link" />
    </button>
  );
}
