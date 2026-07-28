/**
 * Backend-backed for real account events (deposit approved/rejected, etc.)
 * — those persist in the database so a user sees them even if they were
 * offline when they happened. Purchase notifications still have no backend
 * model, so they stay local-storage-only via push(), distinguished from
 * backend entries by a "local_" id prefix. getNotifications()/getUnreadCount()
 * merge both sources; markAsRead()/markAllAsRead() route to the right store
 * based on that prefix; clearAll() only clears the local list — the backend
 * intentionally has no destructive "clear" endpoint.
 */
import { apiClient } from "./apiClient";
import type { PaginatedResponse } from "@/types/api";
import type { AppNotification, NotificationType } from "@/types/notification";

const NOTIFICATIONS_KEY = "myanflix_notifications";

interface BackendNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  payload: { depositId?: string } | null;
  isRead: boolean;
  createdAt: string;
}

function mapBackendNotification(n: BackendNotification): AppNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt,
    depositId: n.payload?.depositId,
  };
}

function isLocalId(id: string): boolean {
  return id.startsWith("local_");
}

function readLocal(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: AppNotification[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
}

async function readBackend(): Promise<AppNotification[]> {
  const res = await apiClient.get<PaginatedResponse<BackendNotification>>("/notifications", {
    params: { limit: 50 },
  });
  return res.items.map(mapBackendNotification);
}

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    const [backend, local] = await Promise.all([readBackend(), Promise.resolve(readLocal())]);
    return [...backend, ...local].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async getUnreadCount(): Promise<number> {
    const [{ unreadCount }, local] = await Promise.all([
      apiClient.get<{ unreadCount: number }>("/notifications/unread-count"),
      Promise.resolve(readLocal()),
    ]);
    return unreadCount + local.filter((n) => !n.isRead).length;
  },

  async markAsRead(id: string): Promise<void> {
    if (isLocalId(id)) {
      writeLocal(readLocal().map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      return;
    }
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    writeLocal(readLocal().map((n) => ({ ...n, isRead: true })));
    await apiClient.patch("/notifications/read-all");
  },

  clearAll(): Promise<void> {
    writeLocal([]);
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
    writeLocal([entry, ...readLocal()]);
  },
};
