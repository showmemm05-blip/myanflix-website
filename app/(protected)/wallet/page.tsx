"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WalletView } from "@/components/views/WalletView";
import { paymentService } from "@/services/api/paymentService";
import { paymentAccountService } from "@/services/api/paymentAccountService";
import { ApiError } from "@/services/api/apiClient";
import { formatKyat } from "@/lib/currency";
import { useLanguage } from "@/lib/context/language-context";
import type { PaymentAccount } from "@/types/payment-account";
import { toast } from "sonner";

const REFERENCE_PATTERN = /^\d{6}$/;

export default function WalletPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [depositOpen, setDepositOpen] = useState(false);
  const [amount, setAmount] = useState("10000");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("10000");
  const [withdrawAccountType, setWithdrawAccountType] = useState<string | null>(null);
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");
  const [withdrawBankName, setWithdrawBankName] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

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
    enabled: depositOpen,
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

  const { data: financeSettings } = useQuery({
    queryKey: ["finance-settings"],
    queryFn: () => paymentService.getSettings(),
  });

  const methodLabel = (account: PaymentAccount) => {
    const label = paymentAccountTypes?.find((t) => t.value === account.type)?.label ?? account.type;
    return account.bankName ? `${label} - ${account.bankName}` : label;
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

  const methodTypes = useMemo(
    () =>
      Array.from(accountsByType.keys()).map((type) => {
        const match = paymentAccountTypes?.find((t) => t.value === type);
        return { type, label: match?.label ?? type, logoUrl: match?.logoUrl ?? null };
      }),
    [accountsByType, paymentAccountTypes],
  );

  // Both of these fall back to "the first available option" whenever
  // nothing has been explicitly selected yet (or the selection no longer
  // exists), without needing an effect to sync it into state.
  const effectiveType = methodTypes.some((m) => m.type === selectedType)
    ? selectedType
    : (methodTypes[0]?.type ?? null);
  const accountsForType = effectiveType ? (accountsByType.get(effectiveType) ?? []) : [];
  const selectedAccount =
    accountsForType.find((a) => a.id === accountId) ?? accountsForType[0] ?? null;

  const resetDepositForm = () => {
    setAmount("10000");
    setSelectedType(null);
    setAccountId(null);
    setReference("");
    setReferenceError(null);
  };

  const handleDeposit = async () => {
    const depositAmountNumber = Number(amount) || 0;
    if (
      financeSettings &&
      (depositAmountNumber < financeSettings.minDepositAmount ||
        depositAmountNumber > financeSettings.maxDepositAmount)
    ) {
      setReferenceError(
        t.wallet.errAmountRange(
          formatKyat(financeSettings.minDepositAmount),
          formatKyat(financeSettings.maxDepositAmount),
        ),
      );
      return;
    }
    if (!selectedAccount) {
      setReferenceError(t.wallet.errSelectAccount);
      return;
    }
    if (!REFERENCE_PATTERN.test(reference)) {
      setReferenceError(t.wallet.errReference);
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
      setDepositOpen(false);
      resetDepositForm();
      toast.success(t.wallet.depositPending);
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

    setIsWithdrawing(true);
    try {
      await paymentService.requestWithdrawal(
        withdrawAmountNumber,
        withdrawAccountType,
        withdrawAccountName.trim(),
        withdrawAccountNumber.trim(),
        withdrawRequiresBankName ? withdrawBankName.trim() : undefined,
      );
      queryClient.invalidateQueries({ queryKey: ["withdrawals", "mine"] });
      setWithdrawOpen(false);
      resetWithdrawForm();
      toast.success(t.wallet.withdrawPending);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    } finally {
      setIsWithdrawing(false);
    }
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
      paymentAccountTypes={paymentAccountTypes}
      financeSettings={financeSettings}
      depositOpen={depositOpen}
      onDepositOpenChange={(open) => {
        setDepositOpen(open);
        if (!open) resetDepositForm();
      }}
      onCloseDeposit={() => setDepositOpen(false)}
      amount={amount}
      onAmountChange={setAmount}
      isAccountsLoading={isAccountsLoading}
      methodTypes={methodTypes}
      effectiveType={effectiveType}
      onSelectType={(type) => {
        setSelectedType(type);
        setAccountId(null);
      }}
      accountsForType={accountsForType}
      selectedAccount={selectedAccount}
      onSelectAccount={setAccountId}
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
    />
  );
}
