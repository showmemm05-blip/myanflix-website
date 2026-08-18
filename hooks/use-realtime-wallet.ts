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
}

interface WithdrawalUpdatedPayload {
  id: string;
  status: WithdrawalStatus;
  amount: number;
  accountType: string;
  accountName: string;
  accountNumber: string;
  rejectionReason?: string | null;
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

    socket.on("wallet.balanceUpdated", handleBalanceUpdated);
    socket.on("deposit.updated", handleDepositUpdated);
    socket.on("withdrawal.updated", handleWithdrawalUpdated);
    socket.on("notification.created", handleNotificationCreated);

    return () => {
      socket.off("wallet.balanceUpdated", handleBalanceUpdated);
      socket.off("deposit.updated", handleDepositUpdated);
      socket.off("withdrawal.updated", handleWithdrawalUpdated);
      socket.off("notification.created", handleNotificationCreated);
    };
  }, [queryClient, t]);
}
