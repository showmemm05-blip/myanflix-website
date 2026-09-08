/**
 * localStorage-persisted JWT tokens + two pub-sub hooks so apiClient can
 * talk to AuthContext without a circular import between the two modules:
 *  - onUnauthorized: force a logout when a refresh attempt fails.
 *  - onTokensChanged: fires after every setTokens()/clear(), so the socket
 *    can be re-handshaked with the rotated access token instead of keeping
 *    the one it was created with (which the gateway rejects as "jwt expired"
 *    on the next reconnect once the 15-minute lifetime has passed).
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
    notifyTokensChanged(accessToken);
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
    notifyTokensChanged(null);
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

type TokensChangedListener = (accessToken: string | null) => void;
const tokensChangedListeners: TokensChangedListener[] = [];

/** Subscribe to token writes; `null` means the store was cleared. */
export function onTokensChanged(listener: TokensChangedListener): () => void {
  tokensChangedListeners.push(listener);
  return () => {
    const index = tokensChangedListeners.indexOf(listener);
    if (index >= 0) tokensChangedListeners.splice(index, 1);
  };
}

function notifyTokensChanged(accessToken: string | null): void {
  tokensChangedListeners.forEach((listener) => listener(accessToken));
}
