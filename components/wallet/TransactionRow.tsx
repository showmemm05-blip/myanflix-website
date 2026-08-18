"use client";

import type { ElementType } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Crown,
  RotateCcw,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { LedgerRow } from "@/components/wallet/LedgerRow";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/types/transaction";

/**
 * THE transaction row — one idiom for both money screens.
 *
 * /wallet ("recent transactions") and /transactions (the full ledger) show the
 * same records; before this they showed them as two different objects, with two
 * different icon maps, two title maps and two layouts. Everything a transaction
 * knows about how it looks now lives here, on top of the shared <LedgerRow>.
 */
const ICON: Record<TransactionType, LucideIcon> = {
  PURCHASE: ArrowUpRight,
  SUBSCRIPTION: Crown,
  DEPOSIT: ArrowDownLeft,
  REFUND: RotateCcw,
  WITHDRAWAL: ArrowUpRight,
  ADJUSTMENT_CREDIT: Wallet,
  ADJUSTMENT_DEBIT: Wallet,
};

/** Money in: everything else is money out and reads red with a minus. */
const CREDIT_TYPES: ReadonlySet<TransactionType> = new Set([
  "DEPOSIT",
  "REFUND",
  "ADJUSTMENT_CREDIT",
]);

export function TransactionRow({
  transaction,
  meta,
  as,
}: {
  transaction: Transaction;
  /** The date line — relative on the wallet's recent list, absolute in the ledger. */
  meta?: string;
  /** `li` when the caller wraps the rows in a real list. */
  as?: ElementType;
}) {
  const { t } = useLanguage();
  const Icon = ICON[transaction.type];
  const credit = CREDIT_TYPES.has(transaction.type);

  const label: Record<TransactionType, string> = {
    PURCHASE: t.transactions.rowPurchase,
    SUBSCRIPTION: t.transactions.rowSubscription,
    DEPOSIT: t.transactions.rowDeposit,
    REFUND: t.transactions.rowRefund,
    WITHDRAWAL: t.transactions.rowWithdrawal,
    ADJUSTMENT_CREDIT: t.transactions.rowAdjustment,
    ADJUSTMENT_DEBIT: t.transactions.rowAdjustment,
  };

  return (
    <LedgerRow
      as={as}
      leading={
        <Icon
          className={cn(
            "size-4",
            transaction.type === "SUBSCRIPTION"
              ? "text-premium"
              : credit
                ? "text-success"
                : "text-destructive",
          )}
        />
      }
      title={transaction.movieTitle ?? label[transaction.type]}
      meta={meta}
      amount={transaction.amount}
      credit={credit}
      status={transaction.status}
    />
  );
}
