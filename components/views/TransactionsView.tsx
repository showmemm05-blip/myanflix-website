"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { ChevronLeftIcon, ChevronRightIcon, FilterChip, SearchField } from "@/components/system";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusChip } from "@/components/wallet/status";
import { transactionKind } from "@/components/wallet/TransactionRow";
import { ArrowDownIcon, ReceiptLineIcon } from "@/components/wallet/icons";
import { moneyDate } from "@/components/wallet/format";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { walletText } from "@/lib/i18n/sections/wallet";
import { formatKyat } from "@/lib/currency";
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

/** The ledger's five columns; under 720px Type and Date hide and each row becomes a card. */
const ROW_GRID =
  "grid grid-cols-[minmax(0,2.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_120px_minmax(0,1fr)] items-center gap-x-4 max-desk:grid-cols-[minmax(0,1fr)_auto] max-desk:gap-y-1.5";

export interface TransactionsViewProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: TransactionTypeFilter;
  onTypeFilterChange: (type: TransactionTypeFilter) => void;
  /** Back to all types and no search. */
  onClearFilters: () => void;
  /** Already filtered client-side by the page. */
  transactions: Transaction[];
  /** Every transaction on the account (the server's total). */
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** The header's available balance (live wallet-summary). */
  balance: number | undefined;
  isBalanceLoading: boolean;
}

/**
 * The ledger (Transactions.dc.html): a back link to Wallet, the title, the
 * balance with a white Deposit button; a filter panel (search by movie
 * title + the seven type chips); a count line with Clear filters; then the
 * table — Transaction · Type · Date · Status · Amount — and numbered pages.
 * Its icons, colours and labels are the same ones the wallet's recent list
 * uses (transactionKind), so moving between /wallet and here is a change of
 * scope, not a change of object.
 */
export function TransactionsView({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onClearFilters,
  transactions,
  totalCount,
  isLoading,
  isError,
  onRetry,
  page,
  totalPages,
  onPageChange,
  balance,
  isBalanceLoading,
}: TransactionsViewProps) {
  const { t, language } = useLanguage();
  const w = useSection(walletText);
  const shell = useSection(shellText);

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

  const filtered = typeFilter !== "all" || search.trim() !== "";
  const isEmpty = !isLoading && !isError && transactions.length === 0;
  const formatDate = (iso: string) =>
    language === "en"
      ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : moneyDate(iso, language);

  const depositLink = (
    <Link href="/wallet?deposit=1" className={buttonVariants({ variant: "play", size: "cta" })}>
      <ArrowDownIcon size={18} />
      {t.wallet.deposit}
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-[calc(1120px+2*var(--mq-gutter))] px-gutter pt-[clamp(20px,2.4vw,36px)]">
      <Link
        href="/wallet"
        className="inline-flex h-8 items-center gap-1 rounded-md text-[14px] font-bold text-fg-muted outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      >
        <ChevronLeftIcon size={18} />
        {t.wallet.title}
      </Link>

      <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <h1 className="text-title text-fg">{t.transactions.title}</h1>
          <p className="mt-2 text-[17px] leading-[26px] text-fg-muted">{t.transactions.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[13px] leading-[18px] text-fg-faint">{w.availableBalance}</p>
            {isBalanceLoading ? (
              <span aria-hidden className="mq-skeleton mt-1 ml-auto block h-6 w-28 rounded-[6px]" />
            ) : (
              <p className="mt-0.5 text-[22px] leading-7 font-extrabold text-money nums">
                {balance === undefined ? "—" : formatKyat(balance)}
              </p>
            )}
          </div>
          {depositLink}
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <section aria-label={w.filters} className="mt-[clamp(24px,2.6vw,36px)] rounded-[20px] bg-surface p-4">
        <label htmlFor="tx-search" className="sr-only">
          {w.searchTransactions}
        </label>
        <SearchField
          id="tx-search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.transactions.searchPlaceholder}
        />
        <div
          role="group"
          aria-label={w.typeGroup}
          className="mq-rail -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5"
        >
          {FILTER_VALUES.map((value) => (
            <FilterChip
              key={value}
              selected={typeFilter === value}
              onClick={() => onTypeFilterChange(value)}
              className="mq-snap shrink-0 whitespace-nowrap"
            >
              {filterLabel[value]}
            </FilterChip>
          ))}
        </div>
      </section>

      {/* ── Count line ────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Stays mounted (a live region), but says nothing on an error — the error box speaks. */}
        <p role="status" className="text-[15px] leading-[22px] font-bold text-fg nums empty:hidden">
          {isLoading
            ? w.loadingTransactionsLine
            : isError
              ? null
              : filtered
                ? w.countMatches(transactions.length)
                : w.countAll(totalCount)}
        </p>
        {filtered && !isLoading && !isError && (
          <Button variant="text" className="h-9 px-1 text-[14px] font-extrabold" onClick={onClearFilters}>
            {w.clearFilters}
          </Button>
        )}
      </div>

      {/* ── The ledger ────────────────────────────────────────────────── */}
      {isError ? (
        <ErrorState onRetry={onRetry} description={shell.errorBody} framed className="mt-3.5 [&>div]:rounded-[20px]" />
      ) : isEmpty ? (
        <div className="mt-3.5">
          <EmptyState
            framed
            headingLevel="h2"
            icon={ReceiptLineIcon}
            title={filtered ? w.noMatchesTitle : t.wallet.noTransactions}
            description={filtered ? w.noMatchesBody : t.wallet.noTransactionsDescription}
            action={
              filtered ? (
                <Button variant="play" size="cta" onClick={onClearFilters}>
                  {w.clearFilters}
                </Button>
              ) : (
                depositLink
              )
            }
            className="rounded-[20px] py-14"
          />
        </div>
      ) : (
        <div
          role="table"
          aria-label={w.tableLabel(page, totalPages)}
          aria-busy={isLoading || undefined}
          className="mt-3.5 rounded-[20px] bg-surface px-6 pt-1.5 pb-2.5 max-desk:px-4"
        >
          <div role="rowgroup" className="max-desk:hidden">
            <div role="row" className={cn(ROW_GRID, "h-12 shadow-[inset_0_-1px_0_var(--mq-hairline)]")}>
              {[w.colTransaction, w.colType, w.colDate, w.colStatus, w.colAmount].map((label, i) => (
                <span
                  key={label}
                  role="columnheader"
                  className={cn(
                    "text-[12px] leading-4 font-extrabold tracking-[0.06em] text-fg-faint uppercase [&:lang(my)]:tracking-normal",
                    i === 4 && "text-right",
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div role="rowgroup">
            {isLoading
              ? ["46%", "38%", "52%", "30%", "44%", "36%", "50%", "40%"].map((width, i) => (
                  <div
                    key={i}
                    role="row"
                    aria-hidden
                    className={cn(
                      ROW_GRID,
                      "min-h-[72px] py-3",
                      i > 0 && "shadow-[inset_0_1px_0_var(--mq-tonal-ghost)]",
                    )}
                  >
                    <span className="flex items-center gap-3.5 max-desk:row-span-2">
                      <span className="mq-skeleton size-10 shrink-0 rounded-[12px]" />
                      <span className="mq-skeleton h-3.5 rounded-[5px]" style={{ width }} />
                    </span>
                    <span className="max-desk:hidden">
                      <span className="mq-skeleton block h-3 w-[70%] rounded-[5px]" />
                    </span>
                    <span className="max-desk:hidden">
                      <span className="mq-skeleton block h-3 w-[70%] rounded-[5px]" />
                    </span>
                    <span className="max-desk:col-start-2 max-desk:row-start-2 max-desk:justify-self-end">
                      <span className="mq-skeleton block h-[22px] w-[76px] rounded-[4px]" />
                    </span>
                    <span className="flex justify-end max-desk:col-start-2 max-desk:row-start-1">
                      <span className="mq-skeleton block h-3.5 w-[90px] rounded-[5px]" />
                    </span>
                  </div>
                ))
              : transactions.map((transaction, i) => {
                  const kind = transactionKind(transaction.type, t);
                  const Icon = kind.icon;
                  const date = formatDate(transaction.createdAt);
                  return (
                    <div
                      key={transaction.id}
                      role="row"
                      className={cn(
                        ROW_GRID,
                        "-mx-3 min-h-[72px] rounded-[12px] p-3 transition-colors duration-150 hover:bg-tonal-ghost",
                        i > 0 && "shadow-[inset_0_1px_0_var(--mq-tonal-ghost)]",
                      )}
                    >
                      <span role="cell" className="flex min-w-0 items-center gap-3.5 max-desk:row-span-2">
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-[12px]",
                            kind.tone === "inflow" && "bg-money/14 text-money",
                            kind.tone === "outflow" && "bg-info/14 text-info",
                            kind.tone === "buy" && "bg-crimson/16 text-link",
                            kind.tone === "sub" && "bg-gold/16 text-gold",
                            kind.tone === "adj" && "bg-tonal-faint text-fg-body",
                          )}
                        >
                          <Icon size={20} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] leading-[22px] font-bold text-fg">
                            {transaction.movieTitle ?? kind.label}
                          </span>
                          <span className="hidden text-[13px] leading-[18px] text-fg-faint nums max-desk:block">
                            {kind.label} · {date}
                          </span>
                        </span>
                      </span>
                      <span role="cell" className="text-[14px] leading-5 text-fg-body max-desk:hidden">
                        {kind.label}
                      </span>
                      <span role="cell" className="text-[14px] leading-5 text-fg-muted nums max-desk:hidden">
                        {date}
                      </span>
                      <span
                        role="cell"
                        className="max-desk:col-start-2 max-desk:row-start-2 max-desk:justify-self-end"
                      >
                        <StatusChip status={transaction.status} />
                      </span>
                      <span
                        role="cell"
                        className={cn(
                          "text-right text-[15px] leading-[22px] font-extrabold whitespace-nowrap nums max-desk:col-start-2 max-desk:row-start-1",
                          kind.credit ? "text-money" : "text-fg",
                        )}
                      >
                        {kind.credit ? "+" : "−"}
                        {formatKyat(transaction.amount)}
                      </span>
                    </div>
                  );
                })}
            {isLoading && (
              <p role="status" className="sr-only">
                {w.loadingTransactions}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Pages ─────────────────────────────────────────────────────── */}
      {!isError && totalPages > 1 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="text-[14px] leading-5 text-fg-faint nums">{t.transactions.pageOf(page, totalPages)}</p>
          <nav aria-label={w.pages} className="flex items-center gap-1">
            <PagerButton
              label={w.previousPage}
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              <ChevronLeftIcon size={20} />
            </PagerButton>
            {pageWindow(page, totalPages).map((item, i) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${i}`} aria-hidden className="flex size-10 items-center justify-center text-fg-faint">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  aria-label={w.pageN(item)}
                  aria-current={page === item ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full text-[15px] outline-none nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
                    page === item
                      ? "bg-play font-extrabold text-ink"
                      : "font-bold text-fg-body hover:bg-tonal-faint",
                  )}
                >
                  {item}
                </button>
              ),
            )}
            <PagerButton
              label={w.nextPage}
              disabled={page === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              <ChevronRightIcon size={20} />
            </PagerButton>
          </nav>
        </div>
      )}
    </div>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-full text-fg outline-none transition-colors hover:bg-tonal-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
