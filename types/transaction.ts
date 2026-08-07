export type TransactionType = "PURCHASE" | "SUBSCRIPTION" | "DEPOSIT" | "REFUND";
export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED";
export type DepositMethod = "KBZ Pay" | "Wave Pay" | "AYA Pay" | "Visa/Mastercard";

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
  reference: string;
  status: DepositStatus;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
}
