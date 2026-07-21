/** The backend has no notification model yet, so this is persisted client-side only (per-browser). */
import type { AppNotification } from "@/types/notification";

const NOTIFICATIONS_KEY = "myanflix_notifications";

function readAll(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: AppNotification[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
}

export const notificationService = {
  getNotifications(): Promise<AppNotification[]> {
    const sorted = readAll().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return Promise.resolve(sorted);
  },

  getUnreadCount(): Promise<number> {
    return Promise.resolve(readAll().filter((n) => !n.isRead).length);
  },

  markAsRead(id: string): Promise<void> {
    writeAll(readAll().map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    return Promise.resolve();
  },

  markAllAsRead(): Promise<void> {
    writeAll(readAll().map((n) => ({ ...n, isRead: true })));
    return Promise.resolve();
  },

  clearAll(): Promise<void> {
    writeAll([]);
    return Promise.resolve();
  },

  /** Adds a client-generated notification — e.g. right after a real purchase completes. */
  push(notification: Omit<AppNotification, "id" | "createdAt" | "isRead">): void {
    const entry: AppNotification = {
      ...notification,
      id: `local_${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    writeAll([entry, ...readAll()]);
  },
};
