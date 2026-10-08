"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WalletView } from "@/components/views/WalletView";
import type { DepositStep } from "@/components/wallet/DepositDialog";
import type { WithdrawResult } from "@/components/wallet/WithdrawDialog";
import type { MethodTileOption } from "@/components/wallet/MethodTileGrid";
import { paymentService } from "@/services/api/paymentService";
import { paymentAccountService } from "@/services/api/paymentAccountService";
import { ApiError } from "@/services/api/apiClient";
import {
  WITHDRAWAL_CODE_STATUS_KEY,
  withdrawalCodeService,
  type WithdrawalCodeStatus,
} from "@/services/api/withdrawalCodeService";
import { authErrorMessage } from "@/lib/auth/auth-errors";
import { formatKyat } from "@/lib/currency";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { walletText } from "@/lib/i18n/sections/wallet";
import type { PaymentAccount } from "@/types/payment-account";
import { toast } from "sonner";

const REFERENCE_PATTERN = /^\d{6}$/;

/**
 * /wallet. `?deposit=1` opens the Deposit dialog on arrival (the
 * Transactions page's Deposit button and the Subscribe dialog's "Add money"
 * link here); closing the dialog takes the parameter back off.
 */
export default function WalletPage() {
  // useSearchParams needs its own Suspense boundary.
  return (
    <Suspense fallback={null}>
      <WalletPageInner />
    </Suspense>
  );
}

function WalletPageInner() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const w = useSection(walletText);

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositStep, setDepositStep] = useState<DepositStep>(1);
  const [amount, setAmount] = useState("10000");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);

  // ?deposit=1 asks for the Deposit dialog. Once the user closes it, the
  // parameter is ignored until it leaves the address (adjusted during render,
  // not in an effect), so a slow URL update can't reopen the dialog.
  const wantsDeposit = searchParams.get("deposit") === "1";
  const [ignoreDepositParam, setIgnoreDepositParam] = useState(false);
  const [prevWantsDeposit, setPrevWantsDeposit] = useState(wantsDeposit);
  if (prevWantsDeposit !== wantsDeposit) {
    setPrevWantsDeposit(wantsDeposit);
    if (!wantsDeposit) setIgnoreDepositParam(false);
  }
  const isDepositOpen = depositOpen || (wantsDeposit && !ignoreDepositParam);
  const dropDepositParam = () => {
    if (!wantsDeposit) return;
    setIgnoreDepositParam(true);
    router.replace("/wallet", { scroll: false });
  };

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("10000");
  const [withdrawAccountType, setWithdrawAccountType] = useState<string | null>(null);
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");
  const [withdrawBankName, setWithdrawBankName] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  // Every withdrawal needs the 6-digit withdrawal code: once the form passes
  // its checks, the same dialog moves on to the code steps ("code"), and
  // after the request goes through, to the "Withdrawal requested" screen.
  const [withdrawPhase, setWithdrawPhase] = useState<"form" | "code" | "done">("form");
  const [withdrawCodeStatus, setWithdrawCodeStatus] = useState<WithdrawalCodeStatus | null>(null);
  // Bumped on every entry, so the code steps always start fresh.
  const [withdrawCodeKey, setWithdrawCodeKey] = useState(0);
  // Back on the form from the code steps: its first field takes the focus.
  const [withdrawFormFocus, setWithdrawFormFocus] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResult | null>(null);

  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);

  const handleCopyAccountNumber = async (accountId: string, accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccountId(accountId);
      setTimeout(() => setCopiedAccountId((prev) => (prev === accountId ? null : prev)), 1500);
    } catch {
      toast.error(t.wallet.copyFailed);
    }
  };

  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
  });

  const {
    data: transactions,
    isLoading: isTxnLoading,
    isError: isTxnError,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: () => paymentService.getTransactions({ limit: 5 }),
  });

  const {
    data: deposits,
    isLoading: isDepositsLoading,
    isError: isDepositsError,
    refetch: refetchDeposits,
  } = useQuery({
    queryKey: ["deposits", "mine"],
    queryFn: () => paymentService.getMyDeposits({ limit: 5 }),
  });

  const { data: paymentAccounts, isLoading: isAccountsLoading } = useQuery({
    queryKey: ["payment-accounts"],
    queryFn: () => paymentAccountService.getAccounts(),
    enabled: isDepositOpen,
    // Always fresh when the dialog opens: an account the admin deactivated
    // a minute ago must not be offered from the 60 s app-wide cache. The
    // realtime listener's socket event covers the dialog while it is open.
    staleTime: 0,
  });

  // The same list (same key, shared cache) for the "Ways to deposit" panel —
  // fetched with the page, so the panel can show which methods are open.
  const { data: depositWayAccounts, isLoading: isDepositWaysLoading } = useQuery({
    queryKey: ["payment-accounts"],
    queryFn: () => paymentAccountService.getAccounts(),
  });

  // Also powers the withdrawal form's "Account Type" picker and the deposit/
  // withdrawal history rows' method logos — fetched unconditionally (it's a
  // small, cheap, cacheable list) rather than gated behind a dialog opening.
  const { data: paymentAccountTypes } = useQuery({
    queryKey: ["payment-accounts", "types"],
    queryFn: () => paymentAccountService.getTypes(),
  });

  const {
    data: withdrawals,
    isLoading: isWithdrawalsLoading,
    isError: isWithdrawalsError,
    refetch: refetchWithdrawals,
  } = useQuery({
    queryKey: ["withdrawals", "mine"],
    queryFn: () => paymentService.getMyWithdrawals({ limit: 5 }),
  });

  // The hero's "N Ks on hold" line: the user's PENDING withdrawals, which the
  // server already set aside from the balance. Same key family as above, so
  // every withdrawals refresh (request, approval, rejection) refreshes it.
  const { data: pendingWithdrawals } = useQuery({
    queryKey: ["withdrawals", "mine", "pending"],
    queryFn: () => paymentService.getMyWithdrawals({ status: "PENDING", limit: 50 }),
  });
  const onHold = pendingWithdrawals
    ? {
        amount: pendingWithdrawals.items.reduce((sum, item) => sum + item.amount, 0),
        count: pendingWithdrawals.total ?? pendingWithdrawals.items.length,
      }
    : null;

  // The right column's "Withdrawal code" card.
  const { data: withdrawalCodeStatus } = useQuery({
    queryKey: WITHDRAWAL_CODE_STATUS_KEY,
    queryFn: () => withdrawalCodeService.getStatus(),
  });

  const { data: financeSettings } = useQuery({
    queryKey: ["finance-settings"],
    queryFn: () => paymentService.getSettings(),
  });

  const methodLabel = (account: PaymentAccount) => {
    const label = paymentAccountTypes?.find((t) => t.value === account.type)?.label ?? account.type;
    return account.bankName ? `${label} - ${account.bankName}` : label;
  };

  const methodOption = (type: string): MethodTileOption => {
    const match = paymentAccountTypes?.find((t) => t.value === type);
    return {
      type,
      label: match?.label ?? type,
      logoUrl: match?.logoUrl ?? null,
      isBank: Boolean(match?.requiresBankName),
    };
  };

  // Group accounts by method type (KBZPay, Bank Account, ...) so the user
  // picks a method first, then which specific account under that method to
  // send to — mirrors how the admin catalogs them.
  const accountsByType = useMemo(() => {
    const map = new Map<string, PaymentAccount[]>();
    for (const account of paymentAccounts ?? []) {
      const list = map.get(account.type) ?? [];
      list.push(account);
      map.set(account.type, list);
    }
    return map;
  }, [paymentAccounts]);

  const methodTypes = Array.from(accountsByType.keys()).map(methodOption);

  const depositWays = useMemo(() => {
    const map = new Map<string, PaymentAccount[]>();
    for (const account of depositWayAccounts ?? []) {
      const list = map.get(account.type) ?? [];
      list.push(account);
      map.set(account.type, list);
    }
    return Array.from(map.entries()).map(([type, accounts]) => {
      const match = paymentAccountTypes?.find((t) => t.value === type);
      return {
        method: {
          type,
          label: match?.label ?? type,
          logoUrl: match?.logoUrl ?? null,
          isBank: Boolean(match?.requiresBankName),
        },
        accounts,
      };
    });
  }, [depositWayAccounts, paymentAccountTypes]);

  // Both of these fall back to "the first available option" whenever
  // nothing has been explicitly selected yet (or the selection no longer
  // exists), without needing an effect to sync it into state.
  const effectiveType = methodTypes.some((m) => m.type === selectedType)
    ? selectedType
    : (methodTypes[0]?.type ?? null);
  const accountsForType = effectiveType ? (accountsByType.get(effectiveType) ?? []) : [];
  const selectedAccount =
    accountsForType.find((a) => a.id === accountId) ?? accountsForType[0] ?? null;
  const selectedMethodName = effectiveType ? methodOption(effectiveType).label : "";

  const resetDepositForm = () => {
    setAmount("10000");
    setSelectedType(null);
    setAccountId(null);
    setReference("");
    setReferenceError(null);
    setAmountError(null);
    setDepositStep(1);
  };

  /** The amount and account checks — step 1's job, and checked again on submit. */
  const depositAmountProblem = (): string | null => {
    const depositAmountNumber = Number(amount) || 0;
    if (depositAmountNumber <= 0) return t.wallet.errAmountPositive;
    if (
      financeSettings &&
      (depositAmountNumber < financeSettings.minDepositAmount ||
        depositAmountNumber > financeSettings.maxDepositAmount)
    ) {
      return t.wallet.errAmountRange(
        formatKyat(financeSettings.minDepositAmount),
        formatKyat(financeSettings.maxDepositAmount),
      );
    }
    if (!selectedAccount) return t.wallet.errSelectAccount;
    return null;
  };

  const handleDepositContinue = () => {
    const problem = depositAmountProblem();
    setAmountError(problem);
    if (!problem) setDepositStep(2);
  };

  const handleDeposit = async () => {
    const problem = depositAmountProblem();
    if (problem) {
      setAmountError(problem);
      setDepositStep(1);
      return;
    }
    if (!selectedAccount) return;
    if (!REFERENCE_PATTERN.test(reference)) {
      setReferenceError(w.referenceError(selectedMethodName));
      return;
    }

    setIsDepositing(true);
    try {
      await paymentService.requestDeposit(
        Number(amount),
        methodLabel(selectedAccount),
        reference,
        selectedAccount.accountName,
        selectedAccount.id,
      );
      queryClient.invalidateQueries({ queryKey: ["deposits", "mine"] });
      // The dialog moves on to "Deposit submitted" (pending admin approval).
      setDepositStep(3);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    } finally {
      setIsDepositing(false);
    }
  };

  const resetWithdrawForm = () => {
    setWithdrawAmount("10000");
    setWithdrawAccountType(null);
    setWithdrawAccountName("");
    setWithdrawAccountNumber("");
    setWithdrawBankName("");
    setWithdrawError(null);
  };

  const withdrawAmountNumber = Number(withdrawAmount) || 0;
  const availableBalance = summary?.balance ?? 0;
  // Same catalog flag the admin sets per payment method — a bank transfer needs
  // a bank named, a mobile wallet doesn't.
  const withdrawRequiresBankName = Boolean(
    paymentAccountTypes?.find((t) => t.value === withdrawAccountType)?.requiresBankName,
  );
  // "KBZPay — Kyaw Zin": where the money goes, as the code step says it.
  const withdrawTypeLabel =
    paymentAccountTypes?.find((t) => t.value === withdrawAccountType)?.label ?? withdrawAccountType ?? "";
  const withdrawDestinationLabel = `${
    withdrawRequiresBankName && withdrawBankName.trim()
      ? `${withdrawTypeLabel} · ${withdrawBankName.trim()}`
      : withdrawTypeLabel
  } — ${withdrawAccountName.trim()}`;

  const handleWithdraw = async () => {
    if (!withdrawAccountType) {
      setWithdrawError(t.wallet.errSelectType);
      return;
    }
    if (!withdrawAccountName.trim() || !withdrawAccountNumber.trim()) {
      setWithdrawError(t.wallet.errAccountDetails);
      return;
    }
    if (withdrawRequiresBankName && !withdrawBankName.trim()) {
      setWithdrawError(t.wallet.errBankName);
      return;
    }
    if (!withdrawAmountNumber || withdrawAmountNumber <= 0) {
      setWithdrawError(t.wallet.errAmountPositive);
      return;
    }
    if (
      financeSettings &&
      (withdrawAmountNumber < financeSettings.minWithdrawalAmount ||
        withdrawAmountNumber > financeSettings.maxWithdrawalAmount)
    ) {
      setWithdrawError(
        t.wallet.errAmountRange(
          formatKyat(financeSettings.minWithdrawalAmount),
          formatKyat(financeSettings.maxWithdrawalAmount),
        ),
      );
      return;
    }
    if (withdrawAmountNumber > availableBalance) {
      setWithdrawError(t.wallet.errInsufficient);
      return;
    }

    // The form is fine — now the withdrawal code. Asked fresh every time (a
    // code made on the phone a minute ago must count): no code yet → create
    // one first; a code → enter it. The server checks it on the request.
    setIsWithdrawing(true);
    setWithdrawError(null);
    try {
      const status = await queryClient.fetchQuery({
        queryKey: WITHDRAWAL_CODE_STATUS_KEY,
        queryFn: () => withdrawalCodeService.getStatus(),
        staleTime: 0,
      });
      setWithdrawCodeStatus(status);
      setWithdrawCodeKey((key) => key + 1);
      setWithdrawPhase("code");
    } catch (err) {
      setWithdrawError(authErrorMessage(err, t));
    } finally {
      setIsWithdrawing(false);
    }
  };

  /**
   * The code step's last action: the withdrawal itself, with the code. On
   * success the dialog moves on to "Withdrawal requested"; a refusal is
   * rethrown for the code step to sort (a code problem stays there,
   * anything else comes back through handleWithdrawCodeFailed).
   */
  const submitWithdrawal = async (withdrawalCode: string) => {
    setIsWithdrawing(true);
    try {
      await paymentService.requestWithdrawal({
        amount: withdrawAmountNumber,
        accountType: withdrawAccountType ?? "",
        accountName: withdrawAccountName.trim(),
        accountNumber: withdrawAccountNumber.trim(),
        bankName: withdrawRequiresBankName ? withdrawBankName.trim() : undefined,
        withdrawalCode,
      });
      queryClient.invalidateQueries({ queryKey: ["withdrawals", "mine"] });
      // The amount leaves the balance the moment the request is made (C-4).
      // Refetch it here too, so the new balance shows even when the socket's
      // wallet.balanceUpdated push doesn't arrive.
      queryClient.invalidateQueries({ queryKey: ["wallet-summary"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      setWithdrawResult({
        amount: withdrawAmountNumber,
        destinationLabel: withdrawDestinationLabel,
        accountNumber: withdrawAccountNumber.trim(),
        balanceAfter: Math.max(0, availableBalance - withdrawAmountNumber),
      });
      setWithdrawPhase("done");
      resetWithdrawForm();
    } finally {
      setIsWithdrawing(false);
    }
  };

  /** Refused for a reason that isn't the code (amount, balance…): back to the form, as before. */
  const handleWithdrawCodeFailed = (err: unknown) => {
    setWithdrawPhase("form");
    setWithdrawCodeStatus(null);
    setWithdrawFormFocus(true);
    toast.error(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
  };

  return (
    <WalletView
      summary={summary}
      isSummaryLoading={isSummaryLoading}
      isSummaryError={isSummaryError}
      onRetrySummary={() => refetchSummary()}
      transactions={transactions?.items}
      isTxnLoading={isTxnLoading}
      isTxnError={isTxnError}
      onRetryTransactions={() => refetchTransactions()}
      deposits={deposits?.items}
      isDepositsLoading={isDepositsLoading}
      isDepositsError={isDepositsError}
      onRetryDeposits={() => refetchDeposits()}
      withdrawals={withdrawals?.items}
      isWithdrawalsLoading={isWithdrawalsLoading}
      isWithdrawalsError={isWithdrawalsError}
      onRetryWithdrawals={() => refetchWithdrawals()}
      onHold={onHold}
      depositWays={depositWays}
      isDepositWaysLoading={isDepositWaysLoading}
      onDepositWith={(type) => {
        setSelectedType(type);
        setAccountId(null);
        setAmountError(null);
        setDepositStep(1);
        setDepositOpen(true);
      }}
      withdrawalCodeStatus={withdrawalCodeStatus}
      paymentAccountTypes={paymentAccountTypes}
      financeSettings={financeSettings}
      depositOpen={isDepositOpen}
      onDepositOpenChange={(open) => {
        setDepositOpen(open);
        if (!open) {
          resetDepositForm();
          dropDepositParam();
        }
      }}
      onCloseDeposit={() => {
        setDepositOpen(false);
        dropDepositParam();
      }}
      depositStep={depositStep}
      onDepositContinue={handleDepositContinue}
      onDepositBack={() => setDepositStep(1)}
      amount={amount}
      onAmountChange={(value) => {
        setAmount(value);
        setAmountError(null);
      }}
      amountError={amountError}
      isAccountsLoading={isAccountsLoading}
      methodTypes={methodTypes}
      effectiveType={effectiveType}
      onSelectType={(type) => {
        setSelectedType(type);
        setAccountId(null);
        setAmountError(null);
      }}
      accountsForType={accountsForType}
      selectedAccount={selectedAccount}
      onSelectAccount={(id) => {
        setAccountId(id);
        setAmountError(null);
      }}
      copiedAccountId={copiedAccountId}
      onCopyAccountNumber={handleCopyAccountNumber}
      reference={reference}
      onReferenceChange={(value) => {
        setReference(value.replace(/\D/g, "").slice(0, 6));
        setReferenceError(null);
      }}
      referenceError={referenceError}
      isDepositing={isDepositing}
      onSubmitDeposit={handleDeposit}
      withdrawOpen={withdrawOpen}
      onWithdrawOpenChange={(open) => {
        setWithdrawOpen(open);
        if (!open) resetWithdrawForm();
        // Every opening starts on the form. (Not reset on close: the code
        // step or the "requested" screen stays on screen while the dialog
        // fades out.)
        if (open) {
          setWithdrawPhase("form");
          setWithdrawCodeStatus(null);
          setWithdrawFormFocus(false);
          setWithdrawResult(null);
        }
      }}
      onCloseWithdraw={() => setWithdrawOpen(false)}
      withdrawAmount={withdrawAmount}
      onWithdrawAmountChange={setWithdrawAmount}
      withdrawAmountNumber={withdrawAmountNumber}
      availableBalance={availableBalance}
      withdrawAccountType={withdrawAccountType}
      onSelectWithdrawType={setWithdrawAccountType}
      withdrawRequiresBankName={withdrawRequiresBankName}
      withdrawBankName={withdrawBankName}
      onWithdrawBankNameChange={setWithdrawBankName}
      withdrawAccountName={withdrawAccountName}
      onWithdrawAccountNameChange={setWithdrawAccountName}
      withdrawAccountNumber={withdrawAccountNumber}
      onWithdrawAccountNumberChange={setWithdrawAccountNumber}
      withdrawError={withdrawError}
      isWithdrawing={isWithdrawing}
      onSubmitWithdraw={handleWithdraw}
      withdrawPhase={withdrawPhase}
      withdrawCodeStatus={withdrawCodeStatus}
      withdrawCodeKey={withdrawCodeKey}
      withdrawDestinationLabel={withdrawDestinationLabel}
      onSubmitWithdrawalCode={submitWithdrawal}
      onWithdrawCodeBack={() => {
        setWithdrawPhase("form");
        setWithdrawCodeStatus(null);
        setWithdrawFormFocus(true);
      }}
      onWithdrawCodeFailed={handleWithdrawCodeFailed}
      withdrawFormFocus={withdrawFormFocus}
      withdrawResult={withdrawResult}
    />
  );
}
