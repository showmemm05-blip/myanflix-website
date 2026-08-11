import Image from "next/image";
import { ArrowDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatKyat } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Deposit, DepositStatus } from "@/types/transaction";
import type { PaymentAccountType } from "@/types/payment-account";

const STATUS_STYLES: Record<DepositStatus, string> = {
  PENDING: "bg-warning/15 text-warning border-warning/30",
  APPROVED: "bg-success/15 text-success border-success/30",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/30",
};

// paymentMethod is a free-typed label, sometimes with " - <bank name>"
// appended (see the wallet page's methodLabel() helper) — so an exact match
// against the catalog only works for non-bank methods; everything else
// needs the "<label> - " prefix check.
function findLogo(paymentMethod: string, types: PaymentAccountType[]): string | null {
  return types.find((t) => paymentMethod === t.label || paymentMethod.startsWith(`${t.label} - `))?.logoUrl ?? null;
}

export function DepositRow({ deposit, types = [] }: { deposit: Deposit; types?: PaymentAccountType[] }) {
  const logoUrl = findLogo(deposit.paymentMethod, types);
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
        {logoUrl ? (
          <Image src={logoUrl} alt="" width={36} height={36} className="size-full object-cover" unoptimized />
        ) : (
          <ArrowDownLeft className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{deposit.paymentMethod}</p>
        <p className="text-xs text-muted-foreground">
          Ref {deposit.reference} ·{" "}
          {new Date(deposit.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        {deposit.status === "REJECTED" && deposit.rejectionReason && (
          <p className="mt-0.5 text-xs text-destructive">{deposit.rejectionReason}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-sm font-semibold tabular-nums">{formatKyat(deposit.amount)}</p>
        <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_STYLES[deposit.status])}>
          {deposit.status.toLowerCase()}
        </Badge>
      </div>
    </div>
  );
}
