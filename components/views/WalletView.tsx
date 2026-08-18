"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Check,
  Copy,
  Loader2,
  ReceiptText,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKyat } from "@/lib/currency";
import { formatRelativeDate } from "@/lib/format";
import { useLanguage } from "@/lib/context/language-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { chipClass, Kicker, SectionHeader, StatTile, Surface } from "@/components/system";
import { AccountShell } from "@/components/views/AccountShell";
import { LedgerRow, LedgerRowSkeletons } from "@/components/wallet/LedgerRow";
import { TransactionRow } from "@/components/wallet/TransactionRow";
import { MethodTileGrid, type MethodTileOption } from "@/components/wallet/MethodTileGrid";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WalletSummary, FinanceSettings } from "@/services/api/paymentService";
import type { Transaction, Deposit, Withdrawal } from "@/types/transaction";
import type { PaymentAccount, PaymentAccountType } from "@/types/payment-account";

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

// paymentMethod is a free-typed label, sometimes with " - <bank name>"
// appended (see the wallet page's methodLabel() helper) — so an exact match
// against the catalog only works for non-bank methods; everything else
// needs the "<label> - " prefix check.
function findLogo(paymentMethod: string, types: PaymentAccountType[]): string | null {
  return types.find((t) => paymentMethod === t.label || paymentMethod.startsWith(`${t.label} - `))?.logoUrl ?? null;
}

export interface WalletViewProps {
  // Balance summary
  summary: WalletSummary | undefined;
  isSummaryLoading: boolean;
  isSummaryError: boolean;
  onRetrySummary: () => void;

  // Ledger lists
  transactions: Transaction[] | undefined;
  isTxnLoading: boolean;
  isTxnError: boolean;
  onRetryTransactions: () => void;
  deposits: Deposit[] | undefined;
  isDepositsLoading: boolean;
  isDepositsError: boolean;
  onRetryDeposits: () => void;
  withdrawals: Withdrawal[] | undefined;
  isWithdrawalsLoading: boolean;
  isWithdrawalsError: boolean;
  onRetryWithdrawals: () => void;

  paymentAccountTypes: PaymentAccountType[] | undefined;
  financeSettings: FinanceSettings | undefined;

  // Deposit dialog
  depositOpen: boolean;
  onDepositOpenChange: (open: boolean) => void;
  /** Close without resetting the form (the Cancel button's historical behavior). */
  onCloseDeposit: () => void;
  amount: string;
  onAmountChange: (value: string) => void;
  isAccountsLoading: boolean;
  methodTypes: MethodTileOption[];
  effectiveType: string | null;
  onSelectType: (type: string) => void;
  accountsForType: PaymentAccount[];
  selectedAccount: PaymentAccount | null;
  onSelectAccount: (accountId: string) => void;
  copiedAccountId: string | null;
  onCopyAccountNumber: (accountId: string, accountNumber: string) => void;
  reference: string;
  onReferenceChange: (value: string) => void;
  referenceError: string | null;
  isDepositing: boolean;
  onSubmitDeposit: () => void;

  // Withdraw dialog
  withdrawOpen: boolean;
  onWithdrawOpenChange: (open: boolean) => void;
  /** Close without resetting the form (the Cancel button's historical behavior). */
  onCloseWithdraw: () => void;
  withdrawAmount: string;
  onWithdrawAmountChange: (value: string) => void;
  withdrawAmountNumber: number;
  availableBalance: number;
  withdrawAccountType: string | null;
  onSelectWithdrawType: (type: string) => void;
  withdrawRequiresBankName: boolean;
  withdrawBankName: string;
  onWithdrawBankNameChange: (value: string) => void;
  withdrawAccountName: string;
  onWithdrawAccountNameChange: (value: string) => void;
  withdrawAccountNumber: string;
  onWithdrawAccountNumberChange: (value: string) => void;
  withdrawError: string | null;
  isWithdrawing: boolean;
  onSubmitWithdraw: () => void;
}

/**
 * The money screen. One idea per region, top to bottom: what you have (the
 * balance hero, in finance emerald with the two quick actions docked to it),
 * what it adds up to (stat tiles), then the three ledgers.
 *
 * The hero is rendered unconditionally so Deposit and Withdraw are reachable
 * even while the summary is loading or has failed — only the figure itself
 * swaps to a skeleton or an inline retry.
 */
export function WalletView(props: WalletViewProps) {
  const { t } = useLanguage();
  const types = props.paymentAccountTypes ?? [];

  const withdrawalTypeLabel = (withdrawal: Withdrawal) =>
    types.find((x) => x.value === withdrawal.accountType)?.label ?? withdrawal.accountType;

  return (
    <AccountShell className="lg:gap-10">
      <PageHeader eyebrow={t.wallet.eyebrow} title={t.wallet.title} subtitle={t.wallet.subtitle} />

      {/* ── Balance hero + quick actions ─────────────────────────────── */}
      <Surface tone="raised" radius="2xl" className="isolate overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-finance/22 via-finance/6 to-transparent"
        />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0">
            <Kicker tone="finance">{t.wallet.currentBalance}</Kicker>
            {props.isSummaryLoading ? (
              <Skeleton className="mt-3 h-10 w-56 max-w-full sm:h-12" />
            ) : props.isSummaryError ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-sm text-muted-foreground">{t.common.somethingWentWrong}</p>
                <Button
                  variant="outline"
                  className="h-9 rounded-full px-4"
                  onClick={props.onRetrySummary}
                >
                  <RotateCcw className="size-4" />
                  {t.common.retry}
                </Button>
              </div>
            ) : (
              <p className="mt-2 font-heading text-4xl font-bold tracking-tight text-finance nums sm:text-5xl">
                {formatKyat(props.summary?.balance ?? 0)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              className="h-11 rounded-full px-5 text-sm font-semibold"
              onClick={() => props.onWithdrawOpenChange(true)}
            >
              <ArrowUpFromLine className="size-4" />
              {t.wallet.withdraw}
            </Button>
            <Button
              className="h-11 rounded-full px-6 text-sm font-semibold"
              onClick={() => props.onDepositOpenChange(true)}
            >
              <ArrowDownToLine className="size-4" />
              {t.wallet.deposit}
            </Button>
          </div>
        </div>
      </Surface>

      {/* ── What it adds up to ───────────────────────────────────────── */}
      {!props.isSummaryError && (
        <div className="grid gap-4 sm:grid-cols-2">
          {props.isSummaryLoading ? (
            <>
              <Skeleton className="h-[92px] rounded-2xl" />
              <Skeleton className="h-[92px] rounded-2xl" />
            </>
          ) : (
            <>
              <StatTile
                icon={TrendingUp}
                tone="success"
                label={t.wallet.totalDeposited}
                value={formatKyat(props.summary?.totalDeposited ?? 0)}
              />
              <StatTile
                icon={TrendingDown}
                tone="neutral"
                label={t.wallet.totalSpent}
                value={formatKyat(props.summary?.totalSpent ?? 0)}
              />
            </>
          )}
        </div>
      )}

      {/* ── Recent transactions ──────────────────────────────────────── */}
      <Panel
        title={t.wallet.recentTransactions}
        action={
          <Link
            href="/transactions"
            className="rounded-full text-sm font-semibold text-primary underline-offset-4 transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t.wallet.viewAll}
          </Link>
        }
      >
        {props.isTxnLoading ? (
          <LedgerRowSkeletons />
        ) : props.isTxnError ? (
          <ErrorState onRetry={props.onRetryTransactions} className="py-10" />
        ) : props.transactions && props.transactions.length > 0 ? (
          props.transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              meta={formatRelativeDate(transaction.createdAt)}
            />
          ))
        ) : (
          <EmptyState
            icon={ReceiptText}
            title={t.wallet.noTransactions}
            description={t.wallet.noTransactionsDescription}
            className="py-10"
          />
        )}
      </Panel>

      {/* ── Deposit / withdrawal history ─────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t.wallet.depositHistory}>
          {props.isDepositsLoading ? (
            <LedgerRowSkeletons />
          ) : props.isDepositsError ? (
            <ErrorState onRetry={props.onRetryDeposits} className="py-10" />
          ) : props.deposits && props.deposits.length > 0 ? (
            props.deposits.map((deposit) => {
              const logoUrl = findLogo(deposit.paymentMethod, types);
              return (
                <LedgerRow
                  key={deposit.id}
                  leading={
                    logoUrl ? (
                      <Image src={logoUrl} alt="" width={40} height={40} className="size-full object-cover" unoptimized />
                    ) : (
                      <ArrowDownLeft className="size-4 text-finance" />
                    )
                  }
                  title={deposit.paymentMethod}
                  meta={`${t.wallet.ref(deposit.reference)} · ${formatRelativeDate(deposit.createdAt)}`}
                  amount={deposit.amount}
                  credit
                  status={deposit.status}
                  note={deposit.status === "REJECTED" ? deposit.rejectionReason : null}
                />
              );
            })
          ) : (
            <EmptyState
              icon={ArrowDownLeft}
              title={t.wallet.noDeposits}
              description={t.wallet.noDepositsDescription}
              className="py-10"
            />
          )}
        </Panel>

        <Panel title={t.wallet.withdrawalHistory}>
          {props.isWithdrawalsLoading ? (
            <LedgerRowSkeletons />
          ) : props.isWithdrawalsError ? (
            <ErrorState onRetry={props.onRetryWithdrawals} className="py-10" />
          ) : props.withdrawals && props.withdrawals.length > 0 ? (
            props.withdrawals.map((withdrawal) => {
              const logoUrl = types.find((x) => x.value === withdrawal.accountType)?.logoUrl ?? null;
              const label = withdrawalTypeLabel(withdrawal);
              return (
                <LedgerRow
                  key={withdrawal.id}
                  leading={
                    logoUrl ? (
                      <Image src={logoUrl} alt="" width={40} height={40} className="size-full object-cover" unoptimized />
                    ) : (
                      <ArrowUpRight className="size-4 text-warning" />
                    )
                  }
                  title={withdrawal.accountName}
                  meta={`${withdrawal.bankName ? `${label} · ${withdrawal.bankName}` : label} · ${withdrawal.accountNumber}`}
                  amount={withdrawal.amount}
                  credit={false}
                  status={withdrawal.status}
                  note={withdrawal.status === "REJECTED" ? withdrawal.rejectionReason : null}
                />
              );
            })
          ) : (
            <EmptyState
              icon={ArrowUpRight}
              title={t.wallet.noWithdrawals}
              description={t.wallet.noWithdrawalsDescription}
              className="py-10"
            />
          )}
        </Panel>
      </div>

      <DepositDialog {...props} />
      <WithdrawDialog {...props} />
    </AccountShell>
  );
}

/* ---------------------------------- bits ---------------------------------- */

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Surface as="section" radius="2xl" className="p-4 sm:p-6">
      <div className="px-1 sm:px-1.5">
        <SectionHeader title={title} action={action} />
      </div>
      <div className="mt-3">{children}</div>
    </Surface>
  );
}

/**
 * Monochrome by design — these are amount shortcuts, not statuses, so they use
 * the same grey-glass/white-pill idiom as the genre chips rather than a color.
 */
function QuickAmountChips({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {QUICK_AMOUNTS.map((qa) => {
        const active = Number(value) === qa;
        return (
          <button
            key={qa}
            type="button"
            onClick={() => onSelect(qa.toString())}
            aria-pressed={active}
            className={chipClass({ tone: "mono", size: "md", selected: active })}
          >
            <span className="nums">{formatKyat(qa)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** One field shape for every money input — a dialog full of inputs should read as one form. */
const fieldInputClass = "h-11 rounded-xl border-white/10 bg-white/[0.04] px-3.5 dark:bg-white/[0.04]";
const dialogContentClass =
  "max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-3xl p-5 ring-white/10 sm:max-w-md sm:p-6";
const dialogFooterClass = "mx-0 mb-0 border-t-0 bg-transparent p-0 pt-1";

/** Label + hint stack used by every field in the two money dialogs. */
function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/* --------------------------------- dialogs -------------------------------- */

function DepositDialog(props: WalletViewProps) {
  const { t } = useLanguage();
  return (
    <Dialog open={props.depositOpen} onOpenChange={props.onDepositOpenChange}>
      <DialogContent className={dialogContentClass}>
        <DialogHeader>
          <Kicker tone="finance">{t.wallet.eyebrow}</Kicker>
          <DialogTitle className="text-section-title">{t.wallet.depositTitle}</DialogTitle>
          <DialogDescription>{t.wallet.depositSubtitle}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <Field
            label={t.wallet.amountLabel}
            htmlFor="amount"
            hint={
              props.financeSettings ? (
                <p className="text-xs text-muted-foreground nums">
                  {t.wallet.amountRange(
                    formatKyat(props.financeSettings.minDepositAmount),
                    formatKyat(props.financeSettings.maxDepositAmount),
                  )}
                </p>
              ) : undefined
            }
          >
            <Input
              id="amount"
              type="number"
              min="1000"
              step="1000"
              value={props.amount}
              onChange={(e) => props.onAmountChange(e.target.value)}
              className={cn(fieldInputClass, "text-base font-semibold nums")}
            />
            <QuickAmountChips value={props.amount} onSelect={props.onAmountChange} />
          </Field>

          <Field label={t.wallet.paymentMethodLabel}>
            {props.isAccountsLoading ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[86px] rounded-2xl" />
                ))}
              </div>
            ) : props.methodTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.wallet.noPaymentMethods}</p>
            ) : (
              <MethodTileGrid methods={props.methodTypes} selected={props.effectiveType} onSelect={props.onSelectType} />
            )}
          </Field>

          {props.accountsForType.length > 0 && (
            <Field label={t.wallet.chooseAccountLabel}>
              <div className="flex flex-col gap-2">
                {props.accountsForType.map((account) => (
                  <AccountOption
                    key={account.id}
                    account={account}
                    selected={props.selectedAccount?.id === account.id}
                    copied={props.copiedAccountId === account.id}
                    onSelect={() => props.onSelectAccount(account.id)}
                    onCopy={() => props.onCopyAccountNumber(account.id, account.accountNumber)}
                  />
                ))}
              </div>
            </Field>
          )}

          <Field
            label={t.wallet.referenceLabel}
            htmlFor="reference"
            hint={<p className="text-xs text-muted-foreground">{t.wallet.referenceHint}</p>}
            error={props.referenceError}
          >
            <Input
              id="reference"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000123"
              value={props.reference}
              onChange={(e) => props.onReferenceChange(e.target.value)}
              className={cn(fieldInputClass, "tracking-[0.3em] nums")}
            />
          </Field>
        </div>

        <DialogFooter className={dialogFooterClass}>
          <Button
            variant="ghost"
            className="h-11 rounded-full px-5"
            onClick={props.onCloseDeposit}
            disabled={props.isDepositing}
          >
            {t.common.cancel}
          </Button>
          <Button
            className="h-11 rounded-full px-5"
            onClick={props.onSubmitDeposit}
            disabled={props.isDepositing || Number(props.amount) <= 0 || !props.selectedAccount}
          >
            {props.isDepositing && <Loader2 className="size-4 animate-spin" />}
            {t.wallet.submitDeposit(formatKyat(Number(props.amount) || 0))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One of the platform's own accounts to transfer to. The whole tile is the
 * selection target; the copy button inside it stops propagation so copying a
 * number never doubles as choosing that account by accident.
 */
function AccountOption({
  account,
  selected,
  copied,
  onSelect,
  onCopy,
}: {
  account: PaymentAccount;
  selected: boolean;
  copied: boolean;
  onSelect: () => void;
  onCopy: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
      className={cn(
        "flex cursor-pointer flex-col gap-1.5 rounded-2xl p-3.5 text-left text-sm ring-1 ring-inset transition-[background-color,box-shadow] duration-200 ease-out outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-primary/12 ring-primary/60"
          : "bg-white/[0.04] ring-white/10 hover:bg-white/8 hover:ring-white/20",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">{account.accountName}</span>
        {selected && (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span>{t.wallet.accountNumberLabel}</span>
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-foreground nums">{account.accountNumber}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            aria-label={copied ? t.wallet.copied : t.wallet.copyNumber}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors outline-none hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </button>
        </span>
      </div>
      {account.bankName && (
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span>{t.wallet.bankNameLabel}</span>
          <span className="min-w-0 truncate font-medium text-foreground">{account.bankName}</span>
        </div>
      )}
      {account.note && <p className="text-xs text-muted-foreground">{account.note}</p>}
    </div>
  );
}

function WithdrawDialog(props: WalletViewProps) {
  const { t } = useLanguage();
  return (
    <Dialog open={props.withdrawOpen} onOpenChange={props.onWithdrawOpenChange}>
      <DialogContent className={dialogContentClass}>
        <DialogHeader>
          <Kicker tone="warning">{t.wallet.eyebrow}</Kicker>
          <DialogTitle className="text-section-title">{t.wallet.withdrawTitle}</DialogTitle>
          <DialogDescription>{t.wallet.withdrawSubtitle}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <Field
            label={t.wallet.amountLabel}
            htmlFor="withdraw-amount"
            hint={
              <>
                <p className="text-xs text-muted-foreground nums">
                  {t.wallet.availableBalance(formatKyat(props.availableBalance))}
                </p>
                {props.financeSettings && (
                  <p className="text-xs text-muted-foreground nums">
                    {t.wallet.amountRangeWithdraw(
                      formatKyat(props.financeSettings.minWithdrawalAmount),
                      formatKyat(props.financeSettings.maxWithdrawalAmount),
                    )}
                  </p>
                )}
              </>
            }
          >
            <Input
              id="withdraw-amount"
              type="number"
              min="1000"
              step="1000"
              value={props.withdrawAmount}
              onChange={(e) => props.onWithdrawAmountChange(e.target.value)}
              className={cn(fieldInputClass, "text-base font-semibold nums")}
            />
            <QuickAmountChips value={props.withdrawAmount} onSelect={props.onWithdrawAmountChange} />
          </Field>

          <Field label={t.wallet.accountTypeLabel}>
            <MethodTileGrid
              methods={(props.paymentAccountTypes ?? []).map((x) => ({
                type: x.value,
                label: x.label,
                logoUrl: x.logoUrl,
              }))}
              selected={props.withdrawAccountType}
              onSelect={props.onSelectWithdrawType}
            />
          </Field>

          {props.withdrawRequiresBankName && (
            <Field label={t.wallet.bankNameLabel} htmlFor="withdraw-bank-name">
              <Input
                id="withdraw-bank-name"
                type="text"
                placeholder={t.wallet.bankNamePlaceholder}
                value={props.withdrawBankName}
                onChange={(e) => props.onWithdrawBankNameChange(e.target.value)}
                className={fieldInputClass}
              />
            </Field>
          )}

          <Field label={t.wallet.accountNameLabel} htmlFor="withdraw-account-name">
            <Input
              id="withdraw-account-name"
              type="text"
              placeholder={t.wallet.accountNamePlaceholder}
              value={props.withdrawAccountName}
              onChange={(e) => props.onWithdrawAccountNameChange(e.target.value)}
              className={fieldInputClass}
            />
          </Field>

          <Field label={t.wallet.accountNumberLabel} htmlFor="withdraw-account-number">
            <Input
              id="withdraw-account-number"
              type="text"
              placeholder={t.wallet.accountNumberPlaceholder}
              value={props.withdrawAccountNumber}
              onChange={(e) => props.onWithdrawAccountNumberChange(e.target.value)}
              className={cn(fieldInputClass, "nums")}
            />
          </Field>

          <Surface tone="subtle" className="flex items-start gap-2.5 p-3.5 text-sm nums">
            <ArrowUpFromLine className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>{t.wallet.withdrawSummary(formatKyat(props.withdrawAmountNumber))}</span>
          </Surface>
          {props.withdrawError && <p className="text-sm text-destructive">{props.withdrawError}</p>}
        </div>

        <DialogFooter className={dialogFooterClass}>
          <Button
            variant="ghost"
            className="h-11 rounded-full px-5"
            onClick={props.onCloseWithdraw}
            disabled={props.isWithdrawing}
          >
            {t.common.cancel}
          </Button>
          <Button
            className="h-11 rounded-full px-5"
            onClick={props.onSubmitWithdraw}
            disabled={
              props.isWithdrawing ||
              props.withdrawAmountNumber <= 0 ||
              !props.withdrawAccountType ||
              !props.withdrawAccountName.trim() ||
              !props.withdrawAccountNumber.trim() ||
              (props.withdrawRequiresBankName && !props.withdrawBankName.trim())
            }
          >
            {props.isWithdrawing && <Loader2 className="size-4 animate-spin" />}
            {t.wallet.submitWithdraw}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
