import { ArrowDownLeft, ArrowUpRight, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatKyat } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionStatus } from "@/types/transaction";

const STATUS_STYLES: Record<TransactionStatus, string> = {
  COMPLETED: "bg-success/15 text-success border-success/30",
  PENDING: "bg-warning/15 text-warning border-warning/30",
  FAILED: "bg-destructive/15 text-destructive border-destructive/30",
};

const TYPE_ICON = {
  PURCHASE: ArrowUpRight,
  DEPOSIT: ArrowDownLeft,
  REFUND: RotateCcw,
};

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const Icon = TYPE_ICON[transaction.type];
  const isCredit = transaction.type === "DEPOSIT" || transaction.type === "REFUND";

  return (
    <div className="flex items-center gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          isCredit ? "bg-success/15 text-success" : "bg-primary/15 text-primary",
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {transaction.movieTitle ?? (transaction.type === "DEPOSIT" ? "Wallet Deposit" : "Refund")}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(transaction.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className={cn("text-sm font-semibold tabular-nums", isCredit ? "text-success" : "text-foreground")}>
          {isCredit ? "+" : "-"}
          {formatKyat(transaction.amount)}
        </p>
        <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_STYLES[transaction.status])}>
          {transaction.status.toLowerCase()}
        </Badge>
      </div>
    </div>
  );
}
