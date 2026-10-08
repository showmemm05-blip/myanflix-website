import type { ElementType, ReactNode } from "react";
import { AlertCircleIcon } from "@/components/system";
import { cn } from "@/lib/utils";
import { StatusChip, type LedgerStatus } from "@/components/wallet/status";

/** The icon tile's colour family (Wallet / Transactions boards). */
export type LedgerTone = "inflow" | "outflow" | "buy" | "sub" | "adj" | "logo";

const TONE: Record<LedgerTone, string> = {
  inflow: "bg-money/14 text-money",
  outflow: "bg-info/14 text-info",
  buy: "bg-crimson/16 text-link",
  sub: "bg-gold/16 text-gold",
  adj: "bg-tonal-faint text-fg-body",
  logo: "",
};

/** What a hidden amount shows (the hero's eye button hides every figure). */
export const MASKED_FIGURE = "••••••";

/** "12,500" or "••••••" — the figure without the unit. */
export function figure(amount: number, masked = false): string {
  return masked ? MASKED_FIGURE : amount.toLocaleString("en-US");
}

/**
 * One row shape for every money list (transactions, deposits, withdrawals).
 *
 * Marquee: a 44px tinted icon tile (or the method's logo), the title and a
 * grey detail line, then the amount — green with "+" for money in, white
 * with "−" for money out, in tabular figures — over its status tag. A
 * rejection reason drops under the row in red. Rows have no frame; the
 * list draws a hairline between neighbours.
 */
export function LedgerRow({
  as: Component = "div",
  leading,
  tone = "adj",
  title,
  meta,
  amount,
  credit,
  status,
  note,
  masked = false,
  className,
}: {
  /** Render as a different element — `li` inside a real list, for instance. */
  as?: ElementType;
  /** The icon (or logo) inside the 44px tile. */
  leading: ReactNode;
  tone?: LedgerTone;
  title: string;
  meta?: string;
  /** Positive magnitude; sign comes from `credit`. */
  amount: number;
  credit: boolean;
  status?: LedgerStatus;
  /** e.g. a rejection reason — rendered as a red line under the row. */
  note?: string | null;
  /** Hide the figure (the wallet hero's eye button). */
  masked?: boolean;
  className?: string;
}) {
  return (
    <Component
      className={cn(
        "relative -mx-2.5 list-none rounded-[12px] px-2.5 py-3 transition-colors duration-150 hover:bg-tonal-ghost",
        className,
      )}
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className={cn(
            "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px]",
            TONE[tone],
          )}
        >
          {leading}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] leading-[22px] font-bold text-fg">{title}</p>
          {meta && <p className="mt-0.5 truncate text-[13px] leading-[18px] text-fg-faint nums">{meta}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={cn(
              "text-[15px] leading-[22px] font-extrabold whitespace-nowrap nums",
              credit ? "text-money" : "text-fg",
            )}
          >
            {credit ? "+" : "−"}
            {figure(amount, masked)} Ks
          </span>
          {status && <StatusChip status={status} />}
        </div>
      </div>
      {note && (
        <p className="mt-2 flex items-start gap-1.5 pl-[58px] text-[13px] leading-[18px] text-danger">
          <AlertCircleIcon size={14} className="mt-0.5 shrink-0" />
          <span className="line-clamp-3">{note}</span>
        </p>
      )}
    </Component>
  );
}

/** The loading shape of the row above — same tile, same two text lines. */
export function LedgerRowSkeletons({ count = 5 }: { count?: number }) {
  const widths = [
    ["46%", "30%"],
    ["38%", "24%"],
    ["52%", "34%"],
    ["42%", "28%"],
    ["48%", "32%"],
  ];
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => {
        const [w1, w2] = widths[i % widths.length];
        return (
          <div key={i} className="flex h-[72px] items-center gap-3.5">
            <span className="mq-skeleton size-11 shrink-0 rounded-[14px]" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="mq-skeleton h-[13px] rounded-[5px]" style={{ width: w1 }} />
              <span className="mq-skeleton h-[11px] rounded-[5px]" style={{ width: w2 }} />
            </span>
            <span className="flex flex-col items-end gap-2">
              <span className="mq-skeleton h-3.5 w-20 rounded-[5px]" />
              <span className="mq-skeleton h-[18px] w-16 rounded-[4px]" />
            </span>
          </div>
        );
      })}
    </div>
  );
}
