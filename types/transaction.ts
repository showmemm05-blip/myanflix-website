export type TransactionType =
  | "PURCHASE"
  | "SUBSCRIPTION"
  | "DEPOSIT"
  | "REFUND"
  | "WITHDRAWAL"
  | "ADJUSTMENT_CREDIT"
  | "ADJUSTMENT_DEBIT"
  /** A lottery ticket purchase, and (phase 3) a lottery prize paid into the wallet. */
  | "LOTTERY_PURCHASE"
  | "LOTTERY_PRIZE";
export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED";

/**
 * Transaction-list filter chips. "ADJUSTMENTS" is a combined chip covering
 * both adjustment directions — one concept to the user, two ledger types.
 * "LOTTERY" does the same for ticket purchases and prizes.
 */
export type TransactionTypeFilter = TransactionType | "all" | "ADJUSTMENTS" | "LOTTERY";

export interface Transaction {
  id: string;
  type: TransactionType;
  movieId: string | null;
  movieTitle: string | null;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
}

export type DepositStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Deposit {
  id: string;
  amount: number;
  paymentMethod: string;
  accountName: string | null;
  reference: string;
  status: DepositStatus;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Withdrawal {
  id: string;
  amount: number;
  accountType: string;
  accountName: string;
  accountNumber: string;
  /** Only captured for bank-transfer account types — a snapshot of this request, not the profile. */
  bankName: string | null;
  status: WithdrawalStatus;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
}
