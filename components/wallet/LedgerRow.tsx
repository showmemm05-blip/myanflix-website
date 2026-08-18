import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatKyat } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip, type LedgerStatus } from "@/components/wallet/status";

/**
 * One row shape for every money list (transactions, deposits, withdrawals) —
 * previously three near-identical components each carrying its own copy of
 * the status-style map.
 *
 * Aurora Theater treatment: no rules between rows, just a hover wash on a
 * generous 12px radius, a glass disc for the icon/logo, and the amount set in
 * tabular numerals so a column of money lines up on the decimal edge. The
 * status chip drops under the amount, where the eye already is.
 */
export function LedgerRow({
  as: Component = "div",
  leading,
  title,
  meta,
  amount,
  credit,
  status,
  note,
}: {
  /** Render as a different element — `li` inside a real list, for instance. */
  as?: ElementType;
  /** Icon disc / logo content; caller controls the visual. */
  leading: ReactNode;
  title: string;
  meta?: string;
  /** Positive magnitude; sign comes from `credit`. */
  amount: number;
  credit: boolean;
  status?: LedgerStatus;
  /** e.g. a rejection reason — rendered as a second muted line. */
  note?: string | null;
}) {
  return (
    <Component className="flex list-none items-center gap-3 rounded-xl px-2 py-3 transition-colors duration-150 ease-out hover:bg-white/[0.03] sm:px-2.5">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/6 ring-1 ring-white/10 ring-inset">
        {leading}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground nums">{meta}</p>}
        {note && <p className="mt-0.5 line-clamp-2 text-xs text-destructive/90">{note}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={cn(
            "text-sm font-semibold nums",
            credit ? "text-success" : "text-destructive",
          )}
        >
          {credit ? "+" : "−"}
          {formatKyat(amount)}
        </span>
        {status && <StatusChip status={status} />}
      </div>
    </Component>
  );
}

/** The loading shape of the row above — same discs, same two text lines. */
export function LedgerRowSkeletons({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3 sm:px-2.5">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32 max-w-[50%]" />
            <Skeleton className="h-3 w-24 max-w-[40%]" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
