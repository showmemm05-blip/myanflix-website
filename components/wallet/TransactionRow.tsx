"use client";

import type { ComponentType, ElementType } from "react";

import { LedgerRow, type LedgerTone } from "@/components/wallet/LedgerRow";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CrownOutlineIcon,
  FilmIcon,
  RefundIcon,
  WalletLineIcon,
} from "@/components/wallet/icons";
import { useLanguage } from "@/lib/context/language-context";
import type { TranslationShape } from "@/lib/i18n/translations";
import type { Transaction, TransactionType } from "@/types/transaction";

/**
 * Everything a transaction knows about how it looks — one map for both money
 * screens (the wallet's recent list and the /transactions ledger).
 */
const KIND: Record<
  TransactionType,
  { icon: ComponentType<{ size?: number }>; tone: LedgerTone; credit: boolean }
> = {
  PURCHASE: { icon: FilmIcon, tone: "buy", credit: false },
  SUBSCRIPTION: { icon: CrownOutlineIcon, tone: "sub", credit: false },
  DEPOSIT: { icon: ArrowDownIcon, tone: "inflow", credit: true },
  REFUND: { icon: RefundIcon, tone: "inflow", credit: true },
  WITHDRAWAL: { icon: ArrowUpIcon, tone: "outflow", credit: false },
  ADJUSTMENT_CREDIT: { icon: WalletLineIcon, tone: "adj", credit: true },
  ADJUSTMENT_DEBIT: { icon: WalletLineIcon, tone: "adj", credit: false },
};

/** Icon, tile colour, direction and the row label for a transaction type. */
export function transactionKind(type: TransactionType, t: TranslationShape) {
  const label: Record<TransactionType, string> = {
    PURCHASE: t.transactions.rowPurchase,
    SUBSCRIPTION: t.transactions.rowSubscription,
    DEPOSIT: t.transactions.rowDeposit,
    REFUND: t.transactions.rowRefund,
    WITHDRAWAL: t.transactions.rowWithdrawal,
    ADJUSTMENT_CREDIT: t.transactions.rowAdjustment,
    ADJUSTMENT_DEBIT: t.transactions.rowAdjustment,
  };
  return { ...KIND[type], label: label[type] };
}

/** THE transaction row (the wallet's "Recent transactions" list). */
export function TransactionRow({
  transaction,
  meta,
  as,
  masked,
  className,
}: {
  transaction: Transaction;
  /** The detail line, e.g. "Movie purchase · 2:14 PM". */
  meta?: string;
  /** `li` when the caller wraps the rows in a real list. */
  as?: ElementType;
  masked?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();
  const kind = transactionKind(transaction.type, t);
  const Icon = kind.icon;
  return (
    <LedgerRow
      as={as}
      className={className}
      leading={<Icon size={20} />}
      tone={kind.tone}
      title={transaction.movieTitle ?? kind.label}
      meta={meta}
      amount={transaction.amount}
      credit={kind.credit}
      status={transaction.status}
      masked={masked}
    />
  );
}
