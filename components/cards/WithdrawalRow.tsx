import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatKyat } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Withdrawal, WithdrawalStatus } from "@/types/transaction";
import type { PaymentAccountType } from "@/types/payment-account";

const STATUS_STYLES: Record<WithdrawalStatus, string> = {
  PENDING: "bg-warning/15 text-warning border-warning/30",
  APPROVED: "bg-success/15 text-success border-success/30",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/30",
};

export function WithdrawalRow({ withdrawal, types = [] }: { withdrawal: Withdrawal; types?: PaymentAccountType[] }) {
  const logoUrl = types.find((t) => t.value === withdrawal.accountType)?.logoUrl ?? null;
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
        {logoUrl ? (
          <Image src={logoUrl} alt="" width={36} height={36} className="size-full object-cover" unoptimized />
        ) : (
          <ArrowUpRight className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {withdrawal.accountType} — {withdrawal.accountName}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(withdrawal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        {withdrawal.status === "REJECTED" && withdrawal.rejectionReason && (
          <p className="mt-0.5 text-xs text-destructive">{withdrawal.rejectionReason}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-sm font-semibold tabular-nums">{formatKyat(withdrawal.amount)}</p>
        <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_STYLES[withdrawal.status])}>
          {withdrawal.status.toLowerCase()}
        </Badge>
      </div>
    </div>
  );
}
