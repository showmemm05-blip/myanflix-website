export type TransactionType = "PURCHASE" | "SUBSCRIPTION" | "DEPOSIT" | "REFUND" | "WITHDRAWAL";
export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED";

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
  status: WithdrawalStatus;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
}
