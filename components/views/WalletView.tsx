"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useTopBarOverHero } from "@/components/layout/shell-context";
import { SETTINGS_SECTION_IDS } from "@/components/views/AccountShell";
import { ChevronRightIcon, CloudOffIcon } from "@/components/system";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { LedgerRow, LedgerRowSkeletons, MASKED_FIGURE, figure } from "@/components/wallet/LedgerRow";
import { TransactionRow, transactionKind } from "@/components/wallet/TransactionRow";
import { MethodLogo, type MethodTileOption } from "@/components/wallet/MethodTileGrid";
import { DepositDialog, type DepositDialogProps } from "@/components/wallet/DepositDialog";
import { WithdrawDialog, type WithdrawDialogProps } from "@/components/wallet/WithdrawDialog";
import { WalletHeroArt } from "@/components/wallet/WalletHeroArt";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  ReceiptLineIcon,
  RetryIcon,
  ShieldIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@/components/wallet/icons";
import { dayKey, dayLabel, maskAccountNumber, moneyTime } from "@/components/wallet/format";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { walletText } from "@/lib/i18n/sections/wallet";
import { formatKyat } from "@/lib/currency";
import { formatLockTime, lockEndFromIso } from "@/lib/withdrawal-code";
import { cn } from "@/lib/utils";
import type { WalletSummary } from "@/services/api/paymentService";
import type { WithdrawalCodeStatus } from "@/services/api/withdrawalCodeService";
import type { Transaction, Deposit, Withdrawal } from "@/types/transaction";
import type { PaymentAccount, PaymentAccountType } from "@/types/payment-account";

// paymentMethod is a free-typed label, sometimes with " - <bank name>"
// appended (see the wallet page's methodLabel() helper) — so an exact match
// against the catalog only works for non-bank methods; everything else
// needs the "<label> - " prefix check.
function findLogo(paymentMethod: string, types: PaymentAccountType[]): string | null {
  return types.find((t) => paymentMethod === t.label || paymentMethod.startsWith(`${t.label} - `))?.logoUrl ?? null;
}

export interface WalletViewProps extends DepositDialogProps, WithdrawDialogProps {
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

  /** Money set aside for the user's PENDING withdrawals (the hero's amber line). */
  onHold: { amount: number; count: number } | null;

  /** "Ways to deposit": the methods with an account to send to, and who receives. */
  depositWays: { method: MethodTileOption; accounts: PaymentAccount[] }[];
  isDepositWaysLoading: boolean;
  /** Opens Deposit with this method already picked. */
  onDepositWith: (type: string) => void;

  /** The "Withdrawal code" card (undefined while loading or on error). */
  withdrawalCodeStatus: WithdrawalCodeStatus | undefined;
}

type Tab = "all" | "dep" | "wd";

/**
 * The money screen (Wallet.dc.html). A full-bleed lantern picture runs under
 * the clear top bar: the title, the balance in big white figures with an
 * eye button that hides every amount, the amber "on hold" line and the
 * three action tiles (Deposit white, Withdraw and History frosted). Below,
 * two columns: "Recent transactions" with All / Deposits / Withdrawals tabs
 * on the left; totals, ways to deposit and the withdrawal-code card on the
 * right.
 *
 * The hero is rendered unconditionally so Deposit and Withdraw are reachable
 * even while the summary is loading or has failed — only the figure itself
 * swaps to a skeleton or an inline retry.
 */
export function WalletView(props: WalletViewProps) {
  useTopBarOverHero();
  const { t, language } = useLanguage();
  const w = useSection(walletText);
  const shell = useSection(shellText);
  const types = props.paymentAccountTypes ?? [];
  const [hidden, setHidden] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ all: null, dep: null, wd: null });

  const TABS: { id: Tab; label: string }[] = [
    { id: "all", label: w.tabAll },
    { id: "dep", label: t.transactions.typeDeposit },
    { id: "wd", label: t.transactions.typeWithdrawal },
  ];
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const jump = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : null;
    if (!delta && jump === null) return;
    event.preventDefault();
    const next = TABS[jump ?? (index + delta + TABS.length) % TABS.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const balance = props.summary?.balance ?? 0;
  const withdrawalTypeLabel = (withdrawal: Withdrawal) =>
    types.find((x) => x.value === withdrawal.accountType)?.label ?? withdrawal.accountType;
  const dayWords = { today: w.today, yesterday: w.yesterday };

  /** Pending first under "Awaiting approval" (every tab), then one group per day. */
  function groupRows<T extends { id: string; createdAt: string; status: string }>(
    items: T[],
  ): { key: string; label: string; awaiting: boolean; items: T[] }[] {
    const groups: { key: string; label: string; awaiting: boolean; items: T[] }[] = [];
    const pending = items.filter((i) => i.status === "PENDING");
    if (pending.length) groups.push({ key: "awaiting", label: w.awaitingApproval, awaiting: true, items: pending });
    for (const item of items) {
      if (item.status === "PENDING") continue;
      const key = dayKey(item.createdAt);
      const last = groups[groups.length - 1];
      if (last && !last.awaiting && last.key === key) last.items.push(item);
      else groups.push({ key, label: dayLabel(item.createdAt, language, dayWords), awaiting: false, items: [item] });
    }
    return groups;
  }

  const rowDivider = "[&+&]:shadow-[inset_0_1px_0_var(--mq-tonal-ghost)]";

  const renderGroups = <T extends { id: string; createdAt: string; status: string }>(
    groups: { key: string; label: string; awaiting: boolean; items: T[] }[],
    row: (item: T) => ReactNode,
  ) => (
    <div className="mq-rise">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          {group.awaiting ? (
            <h3 className="flex items-center gap-2 pt-3.5 pb-1 text-[13px] leading-[18px] font-extrabold text-pending">
              <span aria-hidden className="size-[7px] rounded-full bg-pending" />
              {group.label}
            </h3>
          ) : (
            <h3 className="pt-[18px] pb-1 text-[13px] leading-[18px] font-bold text-fg-faint nums">{group.label}</h3>
          )}
          <ul className="m-0 list-none p-0">{group.items.map(row)}</ul>
        </section>
      ))}
    </div>
  );

  const listState = (
    loading: boolean,
    error: boolean,
    retry: () => void,
    empty: boolean,
    emptyNode: ReactNode,
    ready: () => ReactNode,
  ) =>
    loading ? (
      <div aria-busy="true">
        <LedgerRowSkeletons />
        <p role="status" className="sr-only">
          {w.loadingTransactions}
        </p>
      </div>
    ) : error ? (
      <ErrorState onRetry={retry} title={w.listError} description={shell.errorBody} className="[&>div]:py-10" />
    ) : empty ? (
      emptyNode
    ) : (
      ready()
    );

  const depositAction = (
    <Button variant="play" size="cta" onClick={() => props.onDepositOpenChange(true)} aria-haspopup="dialog">
      <ArrowDownIcon size={18} />
      {t.wallet.deposit}
    </Button>
  );

  const panelBody =
    tab === "all"
      ? listState(
          props.isTxnLoading,
          props.isTxnError,
          props.onRetryTransactions,
          !props.transactions?.length,
          <EmptyState
            icon={ReceiptLineIcon}
            title={t.wallet.noTransactions}
            description={t.wallet.noTransactionsDescription}
            action={depositAction}
            className="py-10"
          />,
          () =>
            renderGroups(groupRows(props.transactions ?? []), (transaction) => {
              const kind = transactionKind(transaction.type, t);
              const time = moneyTime(transaction.createdAt, language);
              return (
                <TransactionRow
                  key={transaction.id}
                  as="li"
                  className={rowDivider}
                  transaction={transaction}
                  masked={hidden}
                  meta={transaction.movieTitle ? `${kind.label} · ${time}` : time}
                />
              );
            }),
        )
      : tab === "dep"
        ? listState(
            props.isDepositsLoading,
            props.isDepositsError,
            props.onRetryDeposits,
            !props.deposits?.length,
            <EmptyState
              icon={ArrowDownIcon}
              title={t.wallet.noDeposits}
              description={t.wallet.noDepositsDescription}
              action={depositAction}
              className="py-10"
            />,
            () =>
              renderGroups(groupRows(props.deposits ?? []), (deposit) => {
                const logoUrl = findLogo(deposit.paymentMethod, types);
                return (
                  <LedgerRow
                    key={deposit.id}
                    as="li"
                    className={rowDivider}
                    tone={logoUrl ? "logo" : "inflow"}
                    leading={
                      logoUrl ? (
                        <MethodLogo logoUrl={logoUrl} label={deposit.paymentMethod} size={44} />
                      ) : (
                        <ArrowDownIcon size={20} />
                      )
                    }
                    title={deposit.paymentMethod}
                    meta={`${t.wallet.ref(deposit.reference)} · ${moneyTime(deposit.createdAt, language)}`}
                    amount={deposit.amount}
                    credit
                    status={deposit.status}
                    note={deposit.status === "REJECTED" ? deposit.rejectionReason : null}
                    masked={hidden}
                  />
                );
              }),
          )
        : listState(
            props.isWithdrawalsLoading,
            props.isWithdrawalsError,
            props.onRetryWithdrawals,
            !props.withdrawals?.length,
            <EmptyState
              icon={ArrowUpIcon}
              title={t.wallet.noWithdrawals}
              description={t.wallet.noWithdrawalsDescription}
              className="py-10"
            />,
            () =>
              renderGroups(groupRows(props.withdrawals ?? []), (withdrawal) => {
                const type = types.find((x) => x.value === withdrawal.accountType);
                const label = withdrawalTypeLabel(withdrawal);
                return (
                  <LedgerRow
                    key={withdrawal.id}
                    as="li"
                    className={rowDivider}
                    tone={type?.logoUrl ? "logo" : "outflow"}
                    leading={
                      type?.logoUrl ? (
                        <MethodLogo logoUrl={type.logoUrl} label={label} size={44} />
                      ) : (
                        <ArrowUpIcon size={20} />
                      )
                    }
                    title={withdrawal.accountName}
                    meta={`${withdrawal.bankName ? `${label} · ${withdrawal.bankName}` : label} · ${maskAccountNumber(
                      withdrawal.accountNumber,
                    )} · ${moneyTime(withdrawal.createdAt, language)}`}
                    amount={withdrawal.amount}
                    credit={false}
                    status={withdrawal.status}
                    note={withdrawal.status === "REJECTED" ? withdrawal.rejectionReason : null}
                    masked={hidden}
                  />
                );
              }),
          );

  return (
    <>
      {/* ── Hero: the picture under the clear bar, balance and the three tiles ── */}
      <section
        aria-labelledby="wallet-title"
        className="under-bar relative flex min-h-[clamp(460px,38vw,540px)] items-end overflow-hidden max-desk:min-h-0"
      >
        <WalletHeroArt className="mq-settle absolute inset-0" />
        <div aria-hidden className="absolute inset-0" style={{ background: "var(--mq-scrim-left)" }} />
        <div aria-hidden className="absolute inset-x-0 top-0 h-[200px]" style={{ background: "var(--mq-scrim-top)" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "var(--mq-scrim-bottom)" }} />

        <div className="mq-rise relative mx-auto w-full max-w-[calc(1120px+2*var(--mq-gutter))] px-gutter pt-[calc(var(--shell-bar-h)+48px)] pb-[clamp(28px,3.6vw,48px)]">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-12 gap-y-7 mq-stack">
            <div className="min-w-0">
              <h1
                id="wallet-title"
                className="text-[clamp(32px,3vw,44px)] leading-[1.1] font-black tracking-[-0.03em] text-fg [&:lang(my)]:tracking-normal"
              >
                {t.wallet.title}
              </h1>

              {props.isSummaryLoading ? (
                <div className="mt-[22px]">
                  <div aria-hidden>
                    <span className="mq-skeleton block h-3.5 w-[140px] rounded-[5px]" />
                    <span className="mq-skeleton mt-4 block h-[72px] w-[min(360px,80%)] rounded-[12px]" />
                    <span className="mq-skeleton mt-4 block h-3 w-[220px] rounded-[5px]" />
                  </div>
                  <p role="status" className="sr-only">
                    {w.loadingBalance}
                  </p>
                </div>
              ) : props.isSummaryError ? (
                <div className="mt-[22px]">
                  <p className="text-[15px] leading-[22px] font-semibold text-fg-body">{w.availableBalance}</p>
                  <div role="alert" className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-3">
                    <span className="flex items-center gap-2.5 text-[22px] leading-7 font-extrabold text-fg">
                      <CloudOffIcon size={24} className="shrink-0 text-danger" />
                      {w.balanceError}
                    </span>
                    <Button variant="tonal" size="toolbar" onClick={props.onRetrySummary}>
                      <RetryIcon size={18} />
                      {t.common.retry}
                    </Button>
                  </div>
                  <p className="mt-2.5 text-[14px] leading-5 text-fg-faint">{w.balanceErrorHint}</p>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex items-center gap-1.5">
                    <span id="wallet-balance-label" className="text-[15px] leading-[22px] font-semibold text-fg-body">
                      {w.availableBalance}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHidden((h) => !h)}
                      aria-pressed={hidden}
                      aria-label={hidden ? w.showBalance : w.hideBalance}
                      className="on-art flex size-9 items-center justify-center rounded-full text-fg outline-none transition-colors hover:bg-tonal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                    >
                      {hidden ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                  <p
                    aria-live="polite"
                    aria-describedby="wallet-balance-label"
                    className="mt-1.5 flex items-baseline gap-3 nums"
                  >
                    <span className="text-[clamp(60px,6.6vw,96px)] leading-none font-black tracking-[-0.04em] text-fg">
                      {figure(balance, hidden)}
                    </span>
                    <span className="text-[clamp(22px,2vw,30px)] leading-[1.2] font-extrabold text-fg-muted">Ks</span>
                  </p>
                  {props.onHold && props.onHold.count > 0 && (
                    <p className="mt-3.5 flex items-center gap-2 text-[14px] leading-5 font-medium text-fg-body nums">
                      <span aria-hidden className="size-[7px] shrink-0 rounded-full bg-pending" />
                      {w.holdLine(hidden ? `${MASKED_FIGURE} Ks` : formatKyat(props.onHold.amount), props.onHold.count)}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-[repeat(3,136px)] gap-2.5 max-desk:w-full max-desk:grid-cols-3">
              <HeroTile
                onClick={() => props.onDepositOpenChange(true)}
                icon={<ArrowDownIcon size={24} />}
                label={t.wallet.deposit}
                primary
              />
              <HeroTile
                onClick={() => props.onWithdrawOpenChange(true)}
                icon={<ArrowUpIcon size={24} />}
                label={t.wallet.withdraw}
              />
              <Link
                href="/transactions"
                className="mq-press on-art flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[12px] p-2.5 text-center text-fg outline-none hover:bg-tonal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
              >
                <ClockIcon size={24} />
                <span className="text-[15px] leading-5 font-extrabold">{w.history}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Two columns: the ledger, and totals / ways / code ── */}
      <div className="mx-auto mt-[clamp(28px,3vw,44px)] w-full max-w-[calc(1120px+2*var(--mq-gutter))] px-gutter">
        <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)] items-start gap-5 mq-stack">
          <section
            aria-labelledby="wallet-recent"
            className="min-w-0 rounded-[20px] bg-surface px-6 pt-5 pb-3.5 max-desk:px-4"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="wallet-recent" className="text-section-title text-fg">
                {t.wallet.recentTransactions}
              </h2>
              <Link
                href="/transactions"
                aria-label={w.seeAllTransactions}
                className="mq-link inline-flex items-center gap-0.5 rounded-md text-[15px] leading-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
              >
                {shell.seeAll}
                <ChevronRightIcon size={16} />
              </Link>
            </div>
            <div role="tablist" aria-label={w.showLabel} className="mt-3.5 flex flex-wrap gap-2">
              {TABS.map((item, index) => {
                const on = tab === item.id;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      tabRefs.current[item.id] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`wallet-tab-${item.id}`}
                    aria-selected={on}
                    aria-controls="wallet-recent-panel"
                    tabIndex={on ? 0 : -1}
                    onClick={() => setTab(item.id)}
                    onKeyDown={(e) => onTabKey(e, index)}
                    className={cn(
                      "h-9 rounded-full px-4 text-[14px] outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
                      on ? "bg-play font-extrabold text-ink" : "bg-raised font-semibold text-fg hover:bg-raised-hover",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div
              id="wallet-recent-panel"
              role="tabpanel"
              aria-labelledby={`wallet-tab-${tab}`}
              className="mt-1.5"
            >
              {panelBody}
            </div>
          </section>

          <div className="flex min-w-0 flex-col gap-4">
            {/* Totals: hidden on a balance error, skeleton while loading. */}
            {!props.isSummaryError && (
              <section aria-label={w.totals} className="rounded-[20px] bg-surface px-6 py-2 max-desk:px-4">
                {props.isSummaryLoading ? (
                  <div aria-hidden>
                    <div className="py-3.5">
                      <span className="mq-skeleton block h-3 w-1/2 rounded-[5px]" />
                      <span className="mq-skeleton mt-2.5 block h-6 w-[70%] rounded-[6px]" />
                    </div>
                    <div className="py-3.5 shadow-[inset_0_1px_0_var(--mq-tonal-ghost)]">
                      <span className="mq-skeleton block h-3 w-2/5 rounded-[5px]" />
                      <span className="mq-skeleton mt-2.5 block h-6 w-3/5 rounded-[6px]" />
                    </div>
                  </div>
                ) : (
                  <dl className="m-0">
                    <TotalRow
                      icon={<TrendUpIcon size={20} />}
                      tint="bg-money/14 text-money"
                      label={t.wallet.totalDeposited}
                      value={`${figure(props.summary?.totalDeposited ?? 0, hidden)} Ks`}
                      valueClassName="text-money"
                    />
                    <TotalRow
                      icon={<TrendDownIcon size={20} />}
                      tint="bg-tonal-faint text-fg-body"
                      label={t.wallet.totalSpent}
                      value={`${figure(props.summary?.totalSpent ?? 0, hidden)} Ks`}
                      divider
                    />
                  </dl>
                )}
              </section>
            )}

            {(props.isDepositWaysLoading || props.depositWays.length > 0) && (
              <section aria-labelledby="wallet-ways" className="rounded-[20px] bg-surface px-6 pt-5 pb-3.5 max-desk:px-4">
                <h2 id="wallet-ways" className="text-[18px] leading-6 font-extrabold text-fg">
                  {w.waysToDeposit}
                </h2>
                <p className="mt-1 mb-2 text-[14px] leading-5 text-fg-faint">{w.waysToDepositBody}</p>
                {props.isDepositWaysLoading ? (
                  <div aria-hidden>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex min-h-16 items-center gap-3.5">
                        <span className="mq-skeleton size-10 rounded-[12px]" />
                        <span className="flex flex-1 flex-col gap-2">
                          <span className="mq-skeleton h-3.5 w-2/5 rounded-[5px]" />
                          <span className="mq-skeleton h-3 w-3/5 rounded-[5px]" />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {props.depositWays.map(({ method, accounts }) => {
                      const names = [...new Set(accounts.map((a) => a.accountName))];
                      return (
                        <li key={method.type} className="[&+&]:shadow-[inset_0_1px_0_var(--mq-tonal-ghost)]">
                          <button
                            type="button"
                            onClick={() => props.onDepositWith(method.type)}
                            aria-haspopup="dialog"
                            aria-label={w.depositWith(method.label)}
                            className="-mx-2.5 flex min-h-16 w-[calc(100%+20px)] items-center gap-3.5 rounded-[12px] p-2.5 text-left text-fg outline-none transition-colors hover:bg-tonal-ghost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                          >
                            <MethodLogo logoUrl={method.logoUrl} label={method.label} isBank={method.isBank} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] leading-[22px] font-bold">{method.label}</span>
                              <span className="block truncate text-[13px] leading-[18px] text-fg-faint">
                                {names.length === 1 ? w.toAccount(names[0]) : w.accountsCount(accounts.length)}
                              </span>
                            </span>
                            <ChevronRightIcon size={18} className="shrink-0 text-fg-faint" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {/* Keyed on the lock so a new status starts a fresh lock clock. */}
            <WithdrawalCodeCard
              key={props.withdrawalCodeStatus?.lockedUntil ?? "none"}
              status={props.withdrawalCodeStatus}
            />
          </div>
        </div>
      </div>

      <DepositDialog {...props} />
      <WithdrawDialog {...props} />
    </>
  );
}

/* ---------------------------------- bits ---------------------------------- */

/**
 * The "Withdrawal code" card: set / not set / locked until a time, and a link
 * to the code section on Settings. The lock uses the same rule as Settings
 * (lockEndFromIso: capped at 15 minutes, already-past = unlocked) and turns
 * itself off when the time comes, so an open page never shows a lock that
 * has ended.
 */
function WithdrawalCodeCard({ status }: { status: WithdrawalCodeStatus | undefined }) {
  const { t, language } = useLanguage();
  const [lockEnd] = useState(() => (status?.hasCode ? lockEndFromIso(status.lockedUntil, Date.now()) : null));
  const [lockOver, setLockOver] = useState(false);
  useEffect(() => {
    if (lockEnd === null) return;
    const timer = setTimeout(() => setLockOver(true), Math.max(0, lockEnd - Date.now()));
    return () => clearTimeout(timer);
  }, [lockEnd]);
  const locked = lockEnd !== null && !lockOver;

  return (
    <section aria-labelledby="wallet-code" className="flex items-start gap-3.5 rounded-[20px] bg-surface p-5 px-6 max-desk:px-4">
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          locked ? "bg-danger/14 text-danger" : "bg-crimson/14 text-link",
        )}
      >
        <ShieldIcon size={20} />
      </span>
      <div className="min-w-0">
        <h2 id="wallet-code" className="text-[16px] leading-[22px] font-extrabold text-fg">
          {t.withdrawalCode.settingsSection}
        </h2>
        <p className={cn("mt-1 text-[14px] leading-5", locked ? "text-danger" : "text-fg-muted")}>
          {!status
            ? t.withdrawalCode.settingsDescription
            : locked && lockEnd !== null
              ? t.withdrawalCode.statusLocked(formatLockTime(lockEnd, language))
              : status.hasCode
                ? t.withdrawalCode.statusSet
                : t.withdrawalCode.statusNone}
        </p>
        <Link
          href={`/settings#${SETTINGS_SECTION_IDS.code}`}
          className="mq-link mt-2 inline-block rounded-md text-[14px] leading-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
        >
          {status && !status.hasCode ? t.withdrawalCode.createCode : t.withdrawalCode.changeCode}
        </Link>
      </div>
    </section>
  );
}

/** A hero action tile: 88px, white for Deposit, frosted for the others. */
function HeroTile({
  onClick,
  icon,
  label,
  primary = false,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className={cn(
        "mq-press flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[12px] p-2.5 text-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
        primary ? "bg-play text-ink" : "on-art text-fg hover:bg-tonal-hover",
      )}
    >
      {icon}
      <span className="text-[15px] leading-5 font-extrabold">{label}</span>
    </button>
  );
}

function TotalRow({
  icon,
  tint,
  label,
  value,
  valueClassName,
  divider = false,
}: {
  icon: ReactNode;
  tint: string;
  label: string;
  value: string;
  valueClassName?: string;
  divider?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 py-3.5",
        divider && "shadow-[inset_0_1px_0_var(--mq-tonal-ghost)]",
      )}
    >
      <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px]", tint)}>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[13px] leading-[18px] text-fg-faint">{label}</dt>
        <dd className={cn("m-0 mt-0.5 text-[22px] leading-7 font-extrabold text-fg nums", valueClassName)}>{value}</dd>
      </div>
    </div>
  );
}
