"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { useLanguage } from "@/lib/context/language-context";
import type { WalletSummary } from "@/services/api/paymentService";
import type { DepositStatus, WithdrawalStatus } from "@/types/transaction";

interface DepositUpdatedPayload {
  id: string;
  status: DepositStatus;
  amount: number;
  paymentMethod: string;
  reference: string;
  rejectionReason?: string | null;
  /**
   * What actually changed. "status" = approve/reject (user-facing);
   * "receiving_account" = an admin edited the destination account of an
   * already-approved deposit (admin bookkeeping only). Optional so an older
   * backend that omits it is still treated as a status change.
   */
  change?: "status" | "receiving_account";
}

interface WithdrawalUpdatedPayload {
  id: string;
  status: WithdrawalStatus;
  amount: number;
  accountType: string;
  accountName: string;
  accountNumber: string;
  rejectionReason?: string | null;
  /**
   * What actually changed. "status" = approve/reject (user-facing);
   * "transfer_account" = an admin edited the account the money was sent
   * from on an already-approved withdrawal (admin bookkeeping only).
   * Optional so an older backend that omits it is still treated as a
   * status change.
   */
  change?: "status" | "transfer_account";
}

interface WalletBalanceUpdatedPayload {
  balance: number;
}

/**
 * Mounted once near the app root (the (protected) layout) so deposit
 * approvals/rejections and balance changes reflect instantly across every
 * page without a manual refresh — the socket itself is a singleton set up
 * by auth-context on login/session-restore; this hook just attaches/detaches
 * listeners for the lifetime of the protected layout.
 */
export function useRealtimeWallet() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleBalanceUpdated = ({ balance }: WalletBalanceUpdatedPayload) => {
      queryClient.setQueryData<WalletSummary | undefined>(["wallet-summary"], (prev) =>
        prev ? { ...prev, balance } : prev,
      );
    };

    const handleDepositUpdated = (payload: DepositUpdatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["deposits"] });

      // Only a real status change deserves a toast. An admin correcting the
      // receiving account of an already-approved deposit re-emits the same
      // event with status APPROVED, and the user must not be told "Deposit
      // approved" again for that. A missing `change` means an older backend,
      // which only ever emitted this event for status changes.
      if (payload.change && payload.change !== "status") return;

      if (payload.status === "APPROVED") {
        toast.success(t.wallet.toastDepositApproved, {
          description: t.wallet.toastDepositApprovedBody,
        });
      } else if (payload.status === "REJECTED") {
        toast.error(t.wallet.toastDepositRejected, {
          description: payload.rejectionReason ?? undefined,
        });
      }
    };

    const handleWithdrawalUpdated = (payload: WithdrawalUpdatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });

      // Same rule as deposits: an admin editing the transfer account of an
      // already-approved withdrawal is bookkeeping, not a new approval, so
      // no "Withdrawal approved" toast. Missing `change` = older backend.
      if (payload.change && payload.change !== "status") return;

      if (payload.status === "APPROVED") {
        toast.success(t.wallet.toastWithdrawalApproved, {
          description: t.wallet.toastWithdrawalApprovedBody,
        });
      } else if (payload.status === "REJECTED") {
        toast.error(t.wallet.toastWithdrawalRejected, {
          description: payload.rejectionReason ?? undefined,
        });
      }
    };

    const handleNotificationCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    };

    // An admin activated, deactivated, edited or removed one of our
    // business accounts: the deposit picker must show the new list at once,
    // not after the 60 s cache. Payload-free — the list is refetched.
    const handlePaymentAccountsChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["payment-accounts"] });
    };

    socket.on("wallet.balanceUpdated", handleBalanceUpdated);
    socket.on("deposit.updated", handleDepositUpdated);
    socket.on("withdrawal.updated", handleWithdrawalUpdated);
    socket.on("notification.created", handleNotificationCreated);
    socket.on("payment-accounts.changed", handlePaymentAccountsChanged);

    return () => {
      socket.off("payment-accounts.changed", handlePaymentAccountsChanged);
      socket.off("wallet.balanceUpdated", handleBalanceUpdated);
      socket.off("deposit.updated", handleDepositUpdated);
      socket.off("withdrawal.updated", handleWithdrawalUpdated);
      socket.off("notification.created", handleNotificationCreated);
    };
  }, [queryClient, t]);
}
