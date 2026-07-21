export type TransactionType = "PURCHASE" | "DEPOSIT" | "REFUND";
export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED";
/** UI-only — the backend has no deposit endpoint or payment-method field on Transaction yet. */
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
