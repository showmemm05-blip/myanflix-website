export type UserRole = "SUPER_ADMIN" | "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export interface AppUser {
  id: string;
  /** What the UI shows: the display name when set, the username otherwise. */
  name: string;
  /** Login identity — never editable from the app. */
  username: string;
  /** The cosmetic, editable name. `null` for every account that never set one. */
  displayName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  walletBalance: number;
  totalDeposited: number;
  totalSpent: number;
  isSubscribed: boolean;
  subscriptionExpiresAt: string | null;
  joinDate: string;
}

export interface NotificationPreferences {
  purchaseConfirmations: boolean;
  newReleases: boolean;
  promotions: boolean;
  announcements: boolean;
}

export type AppLanguage = "en" | "my";
export type AppTheme = "dark" | "system";
