export type NotificationType =
  | "PURCHASE"
  | "SUBSCRIPTION"
  | "PAYMENT"
  | "NEW_RELEASE"
  | "PROMOTION"
  | "ANNOUNCEMENT"
  | "DEPOSIT_APPROVED"
  | "DEPOSIT_REJECTED"
  | "WITHDRAWAL_APPROVED"
  | "WITHDRAWAL_REJECTED";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  movieId?: string;
  posterUrl?: string;
  depositId?: string;
  withdrawalId?: string;
}
