"use client";

import { ChevronLeftIcon, ChevronRightIcon, Receipt, Search } from "lucide-react";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { chipClass, Surface } from "@/components/system";
import { AccountShell } from "@/components/views/AccountShell";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { LedgerRowSkeletons } from "@/components/wallet/LedgerRow";
import { TransactionRow } from "@/components/wallet/TransactionRow";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionTypeFilter } from "@/types/transaction";

const FILTER_VALUES: TransactionTypeFilter[] = [
  "all",
  "PURCHASE",
  "DEPOSIT",
  "REFUND",
  "WITHDRAWAL",
  "SUBSCRIPTION",
  "ADJUSTMENTS",
];

/** first · … · current−1 · current · current+1 · … · last */
function pageWindow(current: number, total: number): (number | "ellipsis")[] {
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const p of pages) {
    if (previous && p - previous > 1) out.push("ellipsis");
    out.push(p);
    previous = p;
  }
  return out;
}

export interface TransactionsViewProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: TransactionTypeFilter;
  onTypeFilterChange: (type: TransactionTypeFilter) => void;
  /** Already filtered client-side by the page. */
  transactions: Transaction[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * The ledger. Its rows are the same <TransactionRow> the wallet's "recent
 * transactions" panel uses — one transaction, one idiom, wherever it shows up —
 * inside the same quiet-glass panel, so moving between /wallet and here is a
 * change of scope, not a change of object.
 */
export function TransactionsView({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  transactions,
  isLoading,
  isError,
  onRetry,
  page,
  totalPages,
  onPageChange,
}: TransactionsViewProps) {
  const { t } = useLanguage();

  const filterLabel: Record<TransactionTypeFilter, string> = {
    all: t.transactions.typeAll,
    PURCHASE: t.transactions.typePurchase,
    DEPOSIT: t.transactions.typeDeposit,
    REFUND: t.transactions.typeRefund,
    WITHDRAWAL: t.transactions.typeWithdrawal,
    SUBSCRIPTION: t.transactions.typeSubscription,
    ADJUSTMENTS: t.transactions.typeAdjustment,
    ADJUSTMENT_CREDIT: t.transactions.typeAdjustment,
    ADJUSTMENT_DEBIT: t.transactions.typeAdjustment,
  };

  return (
    <AccountShell>
      <PageHeader
        eyebrow={t.transactions.eyebrow}
        title={t.transactions.title}
        subtitle={t.transactions.subtitle}
      />

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <Surface radius="2xl" className="flex flex-col gap-3 p-3.5 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.transactions.searchPlaceholder}
            className="h-11 rounded-full border-white/10 bg-white/[0.04] pl-11 dark:bg-white/[0.04]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_VALUES.map((value) => {
            const active = typeFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onTypeFilterChange(value)}
                aria-pressed={active}
                className={chipClass({ tone: "mono", size: "lg", selected: active })}
              >
                {filterLabel[value]}
              </button>
            );
          })}
        </div>
      </Surface>

      {/* ── The ledger ───────────────────────────────────────────────── */}
      {isError ? (
        <ErrorState onRetry={onRetry} />
      ) : isLoading ? (
        <Surface radius="2xl" className={panelClass}>
          <LedgerRowSkeletons count={6} />
        </Surface>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t.transactions.empty}
          description={t.transactions.emptyDescription}
        />
      ) : (
        <Surface as="ul" radius="2xl" className={cn(panelClass, "flex list-none flex-col")}>
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              as="li"
              transaction={transaction}
              meta={new Date(transaction.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            />
          ))}
        </Surface>
      )}

      {!isError && totalPages > 1 && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground nums">{t.transactions.pageOf(page, totalPages)}</p>
          <Pagination className="w-auto sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  aria-label="Go to previous page"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className={cn(
                    "rounded-full",
                    page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer",
                  )}
                >
                  <ChevronLeftIcon />
                </PaginationLink>
              </PaginationItem>
              {pageWindow(page, totalPages).map((item, i) =>
                item === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      isActive={page === item}
                      onClick={() => onPageChange(item)}
                      className="cursor-pointer rounded-full nums"
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationLink
                  aria-label="Go to next page"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className={cn(
                    "rounded-full",
                    page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer",
                  )}
                >
                  <ChevronRightIcon />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </AccountShell>
  );
}

/** The ledger panel — the same box the wallet holds its row lists in. */
const panelClass = "p-2.5 sm:p-3";
