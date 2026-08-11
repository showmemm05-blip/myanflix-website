"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { formatKyat } from "@/lib/currency";
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
        toast.success("Deposit approved", {
          description: "Your deposit has been approved and your balance has been updated.",
        });
      } else if (payload.status === "REJECTED") {
        toast.error("Deposit rejected", {
          description: payload.rejectionReason ?? `Your deposit of ${formatKyat(payload.amount)} was rejected.`,
        });
      }
    };

    const handleWithdrawalUpdated = (payload: WithdrawalUpdatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });

      if (payload.status === "APPROVED") {
        toast.success("Withdrawal approved", {
          description: `Your withdrawal of ${formatKyat(payload.amount)} has been approved and deducted from your balance.`,
        });
      } else if (payload.status === "REJECTED") {
        toast.error("Withdrawal rejected", {
          description: payload.rejectionReason ?? `Your withdrawal of ${formatKyat(payload.amount)} was rejected.`,
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
  }, [queryClient]);
}
