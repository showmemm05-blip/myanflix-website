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
  /** Cosmetic name the profile modal edits; null until the user sets one. */
  displayName?: string | null;
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
  const displayName = u.displayName?.trim() ? u.displayName : null;
  return {
    id: u.id,
    // The display name wins wherever a human name is shown; the username is
    // the fallback because every account has one and most have no display name.
    name: displayName ?? u.username,
    username: u.username,
    displayName,
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

  /**
   * Updates the cosmetic display name — `null` clears it and falls the UI back
   * to the username. Returns the refreshed user (same shape as GET /users/me),
   * so callers can hand it straight to the auth context.
   */
  async updateProfile(displayName: string | null): Promise<AppUser> {
    const user = await apiClient.patch<BackendUser>("/users/me", { displayName });
    return mapUser(user);
  },

  /**
   * Real self-service password change. A wrong current password comes back as
   * a 400 ApiError carrying the backend's message, which the caller surfaces on
   * the current-password field. Existing sessions stay signed in by design.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.patch<{ changed: boolean }>("/users/me/password", {
      currentPassword,
      newPassword,
    });
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
