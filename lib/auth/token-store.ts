/**
 * localStorage-persisted JWT tokens + a pub-sub hook so apiClient can force
 * a logout (via AuthContext) when a refresh attempt fails, without a
 * circular import between the two modules.
 */
import type { AppUser } from "@/types/user";

const ACCESS_TOKEN_KEY = "myanflix_access_token";
const REFRESH_TOKEN_KEY = "myanflix_refresh_token";
const USER_KEY = "myanflix_user";

function isBrowser() {
  return typeof window !== "undefined";
}

export const tokenStore = {
  getAccessToken(): string | null {
    return isBrowser() ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  },

  getRefreshToken(): string | null {
    return isBrowser() ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  },

  getUser(): AppUser | null {
    if (!isBrowser()) return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppUser;
    } catch {
      return null;
    }
  },

  setTokens(accessToken: string, refreshToken: string): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  setUser(user: AppUser): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};

type UnauthorizedListener = () => void;
const unauthorizedListeners: UnauthorizedListener[] = [];

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.push(listener);
  return () => {
    const index = unauthorizedListeners.indexOf(listener);
    if (index >= 0) unauthorizedListeners.splice(index, 1);
  };
}

export function notifyUnauthorized(): void {
  unauthorizedListeners.forEach((listener) => listener());
}
