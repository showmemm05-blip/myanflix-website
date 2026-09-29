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
   * the current-password field. Every OTHER session of the account is signed
   * out; this one stays signed in (its next request refreshes once).
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

  /**
   * DELETE /users/me (H-16/H-25): closes the account for good — personal
   * details removed, every session signed out, money records kept. Refused
   * with a 409 while the wallet holds money or a deposit/withdrawal is
   * waiting for review (see ACCOUNT_DELETE_REFUSALS), and with a 403 for a
   * staff account.
   */
  async deleteAccount(): Promise<void> {
    await apiClient.delete<{ deleted: boolean }>("/users/me");
  },
};

/** The backend's refusals for DELETE /users/me, by exact message → i18n key under `t.settings`. */
export const ACCOUNT_DELETE_REFUSALS = {
  "Your wallet still has money in it. Withdraw or spend it before deleting your account.":
    "deleteRefusedBalance",
  "You have a deposit waiting for review. Wait until it is approved or rejected before deleting your account.":
    "deleteRefusedDeposit",
  "You have a withdrawal waiting for review. Wait until it is approved or rejected before deleting your account.":
    "deleteRefusedWithdrawal",
  "Staff accounts cannot be deleted here. Ask a Super Admin.": "deleteRefusedStaff",
} as const;
