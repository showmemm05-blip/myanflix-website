import { apiClient } from "./apiClient";
import type {
  AppUser,
  NotificationPreferences,
  UserRole,
  UserStatus,
} from "@/types/user";

interface BackendUser {
  id: string;
  username: string;
  phone: string | null;
  /** Absolute URL computed by the backend per-request; null when no photo is set. */
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  balance?: number;
  totalDeposited?: number;
  totalSpent?: number;
  isSubscribed?: boolean;
  subscriptionExpiresAt?: string | null;
}

function mapUser(u: BackendUser): AppUser {
  return {
    id: u.id,
    name: u.username,
    phone: u.phone ?? null,
    avatarUrl: u.avatarUrl ?? null,
    role: u.role,
    status: u.status,
    walletBalance: u.balance ?? 0,
    totalDeposited: u.totalDeposited ?? 0,
    totalSpent: u.totalSpent ?? 0,
    isSubscribed: u.isSubscribed ?? false,
    subscriptionExpiresAt: u.subscriptionExpiresAt ?? null,
    joinDate: u.createdAt,
  };
}

// Notification preferences have no backend model yet — kept in memory for this session only.
let notificationPreferences: NotificationPreferences = {
  purchaseConfirmations: true,
  newReleases: true,
  promotions: false,
  announcements: true,
};

export const profileService = {
  async getProfile(): Promise<AppUser> {
    const user = await apiClient.get<BackendUser>("/users/me");
    return mapUser(user);
  },

  /** Uploads a new profile photo — returns the refreshed user (same shape as GET /users/me). */
  async uploadAvatar(file: File): Promise<AppUser> {
    const form = new FormData();
    form.append("file", file);
    const user = await apiClient.postMultipart<BackendUser>("/users/me/avatar", form);
    return mapUser(user);
  },

  /** Removes the current profile photo — returns the refreshed user. */
  async removeAvatar(): Promise<AppUser> {
    const user = await apiClient.delete<BackendUser>("/users/me/avatar");
    return mapUser(user);
  },

  changePassword(
    _currentPassword: string,
    _newPassword: string,
  ): Promise<void> {
    // No backend endpoint yet for self-service password change.
    return Promise.resolve();
  },

  getNotificationPreferences(): Promise<NotificationPreferences> {
    return Promise.resolve(notificationPreferences);
  },

  updateNotificationPreferences(
    values: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    notificationPreferences = { ...notificationPreferences, ...values };
    return Promise.resolve(notificationPreferences);
  },

  deleteAccount(): Promise<void> {
    // No backend endpoint yet for self-service account deletion.
    return Promise.resolve();
  },
};
