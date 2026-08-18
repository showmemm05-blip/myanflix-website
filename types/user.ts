export type UserRole = "SUPER_ADMIN" | "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export interface AppUser {
  id: string;
  name: string;
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
