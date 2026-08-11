"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Copy,
  ImageIcon,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/cards/StatCard";
import { TransactionRow } from "@/components/cards/TransactionRow";
import { DepositRow } from "@/components/cards/DepositRow";
import { WithdrawalRow } from "@/components/cards/WithdrawalRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { paymentService } from "@/services/api/paymentService";
import { paymentAccountService } from "@/services/api/paymentAccountService";
import { ApiError } from "@/services/api/apiClient";
import { formatKyat } from "@/lib/currency";
import type { PaymentAccount } from "@/types/payment-account";
import { toast } from "sonner";

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];
const REFERENCE_PATTERN = /^\d{6}$/;

function MethodLogo({ logoUrl, size = 20 }: { logoUrl: string | null | undefined; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded border border-white/[0.08] bg-secondary/20"
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt="" width={size} height={size} className="size-full object-cover" unoptimized />
      ) : (
        <ImageIcon className="text-muted-foreground" style={{ width: size * 0.5, height: size * 0.5 }} />
      )}
    </div>
  );
}

// Mirrors the mobile app's method-tile grid (logo above label, active state
// via border/background) so the deposit method and withdraw account-type
// pickers look the same on web as they do in the app.
function MethodTileGrid({
  methods,
  selected,
  onSelect,
}: {
  methods: { type: string; label: string; logoUrl: string | null }[];
  selected: string | null;
  onSelect: (type: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {methods.map((m) => {
        const isActive = selected === m.type;
        return (
          <button
            key={m.type}
            type="button"
            onClick={() => onSelect(m.type)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border py-3.5 transition-colors",
              isActive
                ? "border-primary bg-primary/10"
                : "border-white/10 bg-secondary/50 hover:bg-secondary",
            )}
          >
            <MethodLogo logoUrl={m.logoUrl} size={28} />
            <span
              className={cn(
                "line-clamp-1 px-1 text-center text-xs font-semibold",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function WalletPage() {
  const queryClient = useQueryClient();
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
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);

  const handleCopyAccountNumber = async (accountId: string, accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccountId(accountId);
      setTimeout(() => setCopiedAccountId((prev) => (prev === accountId ? null : prev)), 1500);
    } catch {
      toast.error("Couldn't copy account number");
    }
  };

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
  });

  const { data: transactions, isLoading: isTxnLoading } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: () => paymentService.getTransactions({ limit: 5 }),
  });

  const { data: deposits, isLoading: isDepositsLoading } = useQuery({
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

  const { data: withdrawals, isLoading: isWithdrawalsLoading } = useQuery({
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
        `Amount must be between ${formatKyat(financeSettings.minDepositAmount)} and ${formatKyat(financeSettings.maxDepositAmount)}.`,
      );
      return;
    }
    if (!selectedAccount) {
      setReferenceError("Select a payment method to continue.");
      return;
    }
    if (!REFERENCE_PATTERN.test(reference)) {
      setReferenceError("Enter the exact 6-digit transaction reference from your payment.");
      return;
    }

    setIsDepositing(true);
    try {
      await paymentService.requestDeposit(
        Number(amount),
        methodLabel(selectedAccount),
        reference,
        selectedAccount.accountName,
      );
      queryClient.invalidateQueries({ queryKey: ["deposits", "mine"] });
      setDepositOpen(false);
      resetDepositForm();
      toast.success("Deposit submitted", {
        description: "Your deposit is pending admin approval — your balance will update once it's reviewed.",
      });
    } catch (err) {
      toast.error("Couldn't submit deposit", {
        description: err instanceof ApiError ? err.message : "Please try again.",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const resetWithdrawForm = () => {
    setWithdrawAmount("10000");
    setWithdrawAccountType(null);
    setWithdrawAccountName("");
    setWithdrawAccountNumber("");
    setWithdrawError(null);
  };

  const withdrawAmountNumber = Number(withdrawAmount) || 0;
  const availableBalance = summary?.balance ?? 0;

  const handleWithdraw = async () => {
    if (!withdrawAccountType) {
      setWithdrawError("Select an account type to continue.");
      return;
    }
    if (!withdrawAccountName.trim() || !withdrawAccountNumber.trim()) {
      setWithdrawError("Enter the account name and account/phone number to receive your withdrawal.");
      return;
    }
    if (!withdrawAmountNumber || withdrawAmountNumber <= 0) {
      setWithdrawError("Enter a valid amount.");
      return;
    }
    if (
      financeSettings &&
      (withdrawAmountNumber < financeSettings.minWithdrawalAmount ||
        withdrawAmountNumber > financeSettings.maxWithdrawalAmount)
    ) {
      setWithdrawError(
        `Amount must be between ${formatKyat(financeSettings.minWithdrawalAmount)} and ${formatKyat(financeSettings.maxWithdrawalAmount)}.`,
      );
      return;
    }
    if (withdrawAmountNumber > availableBalance) {
      setWithdrawError("You can't withdraw more than your available wallet balance.");
      return;
    }

    setIsWithdrawing(true);
    try {
      await paymentService.requestWithdrawal(
        withdrawAmountNumber,
        withdrawAccountType,
        withdrawAccountName.trim(),
        withdrawAccountNumber.trim(),
      );
      queryClient.invalidateQueries({ queryKey: ["withdrawals", "mine"] });
      setWithdrawOpen(false);
      resetWithdrawForm();
      toast.success("Withdrawal requested", {
        description: "Your withdrawal is pending admin approval — your balance updates only once it's approved.",
      });
    } catch (err) {
      toast.error("Couldn't submit withdrawal", {
        description: err instanceof ApiError ? err.message : "Please try again.",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Wallet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your balance and deposits.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
            <ArrowDownToLine className="size-4" />
            Withdraw
          </Button>
          <Button onClick={() => setDepositOpen(true)}>
            <ArrowUpRight className="size-4" />
            Deposit
          </Button>
        </div>
      </div>

      {isSummaryLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={WalletIcon} label="Current Balance" value={formatKyat(summary?.balance ?? 0)} />
          <StatCard icon={TrendingUp} label="Total Deposited" value={formatKyat(summary?.totalDeposited ?? 0)} />
          <StatCard icon={TrendingDown} label="Total Spent" value={formatKyat(summary?.totalSpent ?? 0)} />
        </div>
      )}

      <Card className="glass-card mt-6 border-white/[0.08]">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Transactions</CardTitle>
          <Button variant="ghost" size="sm" render={<Link href="/transactions" />} nativeButton={false}>
            View all
          </Button>
        </CardHeader>
        <CardContent>
          {isTxnLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            transactions?.items.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)
          )}
        </CardContent>
      </Card>

      <Card className="glass-card mt-6 border-white/[0.08]">
        <CardHeader>
          <CardTitle>Deposit History</CardTitle>
        </CardHeader>
        <CardContent>
          {isDepositsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : deposits && deposits.items.length > 0 ? (
            deposits.items.map((deposit) => (
              <DepositRow key={deposit.id} deposit={deposit} types={paymentAccountTypes ?? []} />
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No deposits yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card mt-6 border-white/[0.08]">
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          {isWithdrawalsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : withdrawals && withdrawals.items.length > 0 ? (
            withdrawals.items.map((withdrawal) => (
              <WithdrawalRow key={withdrawal.id} withdrawal={withdrawal} types={paymentAccountTypes ?? []} />
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No withdrawals yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={depositOpen}
        onOpenChange={(open) => {
          setDepositOpen(open);
          if (!open) resetDepositForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deposit funds</DialogTitle>
            <DialogDescription>
              Submit your payment reference for review — your balance updates once an admin approves it.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount (Ks)</Label>
              <Input id="amount" type="number" min="1000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(qa.toString())}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary"
                  >
                    {formatKyat(qa)}
                  </button>
                ))}
              </div>
              {financeSettings && (
                <p className="text-xs text-muted-foreground">
                  Amount must be between {formatKyat(financeSettings.minDepositAmount)} and{" "}
                  {formatKyat(financeSettings.maxDepositAmount)}.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Payment method</Label>
              {isAccountsLoading ? (
                <div className="h-9 animate-pulse rounded-md bg-muted" />
              ) : methodTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payment methods are available right now. Please try again later.
                </p>
              ) : (
                <MethodTileGrid
                  methods={methodTypes}
                  selected={effectiveType}
                  onSelect={(type) => {
                    setSelectedType(type);
                    setAccountId(null);
                  }}
                />
              )}
            </div>
            {accountsForType.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>{accountsForType.length > 1 ? "Choose an account" : "Send to"}</Label>
                <div className="flex flex-col gap-2">
                  {accountsForType.map((account) => {
                    const isSelected = selectedAccount?.id === account.id;
                    const isCopied = copiedAccountId === account.id;
                    return (
                      <div
                        key={account.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setAccountId(account.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setAccountId(account.id);
                          }
                        }}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left text-sm transition-colors",
                          isSelected
                            ? "border-primary/50 bg-primary/5"
                            : "border-white/10 bg-secondary/50 hover:bg-secondary",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{account.accountName}</span>
                          {isSelected && <Check className="size-4 text-primary" />}
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Account number</span>
                          <span className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{account.accountNumber}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyAccountNumber(account.id, account.accountNumber);
                              }}
                              aria-label="Copy account number"
                              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              {isCopied ? (
                                <Check className="size-3.5 text-success" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </button>
                          </span>
                        </div>
                        {account.bankName && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Bank</span>
                            <span className="font-medium text-foreground">{account.bankName}</span>
                          </div>
                        )}
                        {account.note && <p className="text-xs text-muted-foreground">{account.note}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reference">Transaction reference</Label>
              <Input
                id="reference"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000123"
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setReferenceError(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter the exact 6-digit reference number from your{" "}
                {selectedAccount ? methodLabel(selectedAccount) : "payment method's"} payment.
              </p>
              {referenceError && <p className="text-sm text-destructive">{referenceError}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)} disabled={isDepositing}>
              Cancel
            </Button>
            <Button onClick={handleDeposit} disabled={isDepositing || Number(amount) <= 0 || !selectedAccount}>
              {isDepositing && <Loader2 className="size-4 animate-spin" />}
              Submit {formatKyat(Number(amount) || 0)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={withdrawOpen}
        onOpenChange={(open) => {
          setWithdrawOpen(open);
          if (!open) resetWithdrawForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw funds</DialogTitle>
            <DialogDescription>
              Submit a withdrawal request for review — your balance is only deducted once an admin approves it.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="withdraw-amount">Amount (Ks)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                min="1000"
                step="1000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setWithdrawAmount(qa.toString())}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary"
                  >
                    {formatKyat(qa)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Available balance: {formatKyat(availableBalance)}
              </p>
              {financeSettings && (
                <p className="text-xs text-muted-foreground">
                  Amount must be between {formatKyat(financeSettings.minWithdrawalAmount)} and{" "}
                  {formatKyat(financeSettings.maxWithdrawalAmount)}.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Account type</Label>
              <MethodTileGrid
                methods={(paymentAccountTypes ?? []).map((t) => ({ type: t.value, label: t.label, logoUrl: t.logoUrl }))}
                selected={withdrawAccountType}
                onSelect={setWithdrawAccountType}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="withdraw-account-name">Account name</Label>
              <Input
                id="withdraw-account-name"
                type="text"
                placeholder="Full name on the account"
                value={withdrawAccountName}
                onChange={(e) => setWithdrawAccountName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="withdraw-account-number">Account number / phone number</Label>
              <Input
                id="withdraw-account-number"
                type="text"
                placeholder="e.g. 09xxxxxxxxx"
                value={withdrawAccountNumber}
                onChange={(e) => setWithdrawAccountNumber(e.target.value)}
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-secondary/50 p-3 text-sm">
              You are requesting to withdraw{" "}
              <span className="font-semibold">{formatKyat(withdrawAmountNumber)}</span>.
            </div>
            {withdrawError && <p className="text-sm text-destructive">{withdrawError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)} disabled={isWithdrawing}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={
                isWithdrawing ||
                withdrawAmountNumber <= 0 ||
                !withdrawAccountType ||
                !withdrawAccountName.trim() ||
                !withdrawAccountNumber.trim()
              }
            >
              {isWithdrawing && <Loader2 className="size-4 animate-spin" />}
              Request {formatKyat(withdrawAmountNumber)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
