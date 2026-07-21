export type NotificationType = "PURCHASE" | "PAYMENT" | "NEW_RELEASE" | "PROMOTION" | "ANNOUNCEMENT";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  movieId?: string;
  posterUrl?: string;
}
