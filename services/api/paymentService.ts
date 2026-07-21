import { apiClient } from "./apiClient";
import { profileService } from "./profileService";
import type { PaginatedResponse, PaginationParams } from "@/types/api";
import type { DepositMethod, Transaction } from "@/types/transaction";

export interface WalletSummary {
  balance: number;
  totalDeposited: number;
  totalSpent: number;
}

interface BackendTransaction {
  id: string;
  userId: string;
  type: Transaction["type"];
  amount: number;
  status: Transaction["status"];
  movieId: string | null;
  movieTitle: string | null;
  createdAt: string;
}

function mapTransaction(t: BackendTransaction): Transaction {
  return {
    id: t.id,
    type: t.type,
    movieId: t.movieId,
    movieTitle: t.movieTitle,
    amount: t.amount,
    status: t.status,
    createdAt: t.createdAt,
  };
}

export const paymentService = {
  /** /wallet only returns balance — total deposited/spent come from the richer /users/me aggregate. */
  async getWalletSummary(): Promise<WalletSummary> {
    const profile = await profileService.getProfile();
    return {
      balance: profile.walletBalance,
      totalDeposited: profile.totalDeposited,
      totalSpent: profile.totalSpent,
    };
  },

  async getTransactions(pagination: PaginationParams = {}): Promise<PaginatedResponse<Transaction>> {
    const res = await apiClient.get<PaginatedResponse<BackendTransaction>>("/wallet/transactions", {
      params: pagination,
    });
    return { ...res, items: res.items.map(mapTransaction) };
  },

  /**
   * UI-only — the backend has no deposit endpoint yet. Resolves without
   * persisting anything so the demo flow still completes.
   */
  deposit(amount: number, method: DepositMethod): Promise<Transaction> {
    const entry: Transaction = {
      id: `local_${Date.now()}`,
      type: "DEPOSIT",
      movieId: null,
      movieTitle: null,
      amount,
      status: "COMPLETED",
      createdAt: new Date().toISOString(),
    };
    void method;
    return Promise.resolve(entry);
  },
};
