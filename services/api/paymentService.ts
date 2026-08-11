import { apiClient } from "./apiClient";
import { profileService } from "./profileService";
import type { PaginatedResponse, PaginationParams } from "@/types/api";
import type {
  Deposit,
  DepositStatus,
  Transaction,
  Withdrawal,
  WithdrawalStatus,
} from "@/types/transaction";

export interface WalletSummary {
  balance: number;
  totalDeposited: number;
  totalSpent: number;
}

export interface FinanceSettings {
  minDepositAmount: number;
  maxDepositAmount: number;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
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
   * Submits a deposit request — this only creates a PENDING record; the
   * balance does not move until an admin approves it (see the wallet page's
   * realtime handling for the approval/rejection update).
   */
  requestDeposit(amount: number, method: string, reference: string, accountName?: string): Promise<Deposit> {
    return apiClient.post<Deposit>("/deposits", {
      amount,
      paymentMethod: method,
      accountName,
      reference,
    });
  },

  async getMyDeposits(query: PaginationParams & { status?: DepositStatus } = {}): Promise<PaginatedResponse<Deposit>> {
    return apiClient.get<PaginatedResponse<Deposit>>("/deposits/me", { params: query });
  },

  /**
   * Submits a withdrawal request — this only creates a PENDING record; the
   * balance is never touched until an admin approves it (see the wallet
   * page's realtime handling for the approval/rejection update).
   */
  requestWithdrawal(
    amount: number,
    accountType: string,
    accountName: string,
    accountNumber: string,
  ): Promise<Withdrawal> {
    return apiClient.post<Withdrawal>("/withdrawals", {
      amount,
      accountType,
      accountName,
      accountNumber,
    });
  },

  async getMyWithdrawals(
    query: PaginationParams & { status?: WithdrawalStatus } = {},
  ): Promise<PaginatedResponse<Withdrawal>> {
    return apiClient.get<PaginatedResponse<Withdrawal>>("/withdrawals/me", { params: query });
  },

  getSettings(): Promise<FinanceSettings> {
    return apiClient.get<FinanceSettings>("/finance-settings");
  },
};
