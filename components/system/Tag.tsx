import * as React from "react";

import { cn } from "@/lib/utils";
import { CrownIcon, StarIcon } from "./icons";

/**
 * MARQUEE TAGS — 22px, radius 4, 11px heavy caps (SHELL.md §13).
 *
 *   <Tag kind="new">NEW</Tag>               crimson fill
 *   <Tag kind="premium">PREMIUM</Tag>       gold on gold-16%, with a crown
 *   <Tag kind="free">FREE</Tag>             green on green-16%
 *   <Tag kind="age">PG-13</Tag>             outlined, 35% white ring
 *   <Tag kind="pending">PENDING</Tag>       amber
 *   <Tag kind="rejected">REJECTED</Tag>     danger
 *   <Tag kind="approved">APPROVED</Tag>     green (money rows)
 *   <Tag kind="neutral">…</Tag>             8% white
 *
 * Pass the (translated) words as children; Burmese is never tracked.
 * <CountBadge n={3}/> is the 20px crimson count disc; <Rating value="8.2"/>
 * is the gold star + white number.
 */
export type TagKind = "new" | "premium" | "free" | "age" | "pending" | "rejected" | "approved" | "neutral";

const KIND: Record<TagKind, string> = {
  new: "bg-crimson text-white",
  premium: "bg-gold/16 text-gold",
  free: "bg-money/16 text-money",
  age: "bg-transparent font-bold tracking-normal text-fg-body shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]",
  pending: "bg-pending/16 text-pending",
  rejected: "bg-danger/16 text-danger",
  approved: "bg-money/16 text-money",
  neutral: "bg-tonal-faint text-fg-muted",
};

export function Tag({
  kind = "neutral",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { kind?: TagKind }) {
  return (
    <span
      data-slot="tag"
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1 rounded-[4px] px-[7px] text-[11px] leading-[22px] font-extrabold tracking-[0.06em] whitespace-nowrap uppercase [&:lang(my)]:tracking-normal",
        KIND[kind],
        className,
      )}
      {...props}
    >
      {kind === "premium" && <CrownIcon size={11} />}
      {children}
    </span>
  );
}

/** The crimson count disc (unread counts, filter counts). */
export function CountBadge({ n, className, ...props }: React.ComponentProps<"span"> & { n: number }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-crimson px-1.5 text-[11px] leading-5 font-extrabold text-white tabular-nums",
        className,
      )}
      {...props}
    >
      {n}
    </span>
  );
}

/** Gold star + the number in white. `size="lg"` is the hero meta line (15px). */
export function Rating({
  value,
  size = "md",
  className,
}: {
  value: string | number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const icon = size === "sm" ? 12 : size === "lg" ? 15 : 14;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] font-extrabold text-fg tabular-nums",
        size === "sm" ? "text-[13px] leading-[18px] font-bold" : size === "lg" ? "text-[15px] leading-[22px]" : "text-sm leading-5",
        className,
      )}
    >
      <StarIcon size={icon} className="text-gold" />
      {typeof value === "number" ? value.toFixed(1) : value}
    </span>
  );
}
