"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/api/authService";
import { profileService } from "@/services/api/profileService";
import { tokenStore, onUnauthorized } from "@/lib/auth/token-store";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { AppUser } from "@/types/user";

interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Step 1: does an account already exist for this phone? */
  checkPhoneExists: (phone: string) => Promise<boolean>;
  /** Step 2 (returning phone): throws on a wrong password. */
  verifyPassword: (phone: string, password: string) => Promise<void>;
  /** Step 3: sends a code to `phone` — throws (e.g. cooldown/rate-limit) on failure. */
  requestOtp: (phone: string) => Promise<void>;
  /** Step 3: verifies the code, logging into the existing account or creating one — `password` required only when creating. */
  verifyOtp: (phone: string, code: string, password?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  /** Replace the in-memory user (e.g. after an avatar change) so every consumer — navbar included — updates instantly. */
  updateUser: (user: AppUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const profile = await profileService.getProfile();
      setUser(profile);
    } catch {
      tokenStore.clear();
      setUser(null);
    }
  };

  useEffect(() => {
    const accessToken = tokenStore.getAccessToken();
    if (!accessToken) {
      setIsLoading(false);
      return;
    }
    connectSocket(accessToken);
    loadProfile().finally(() => setIsLoading(false));
  }, []);

  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        disconnectSocket();
        // Wipes cached PER-USER queries (wallet balance, subscription plans,
        // notifications, ...) — without this, stale per-user data from the
        // now-expired session lingers and can bleed into whoever logs in
        // next on this browser.
        //
        // Deliberately NOT queryClient.clear(): site-wide public data must
        // survive. An anonymous visitor browsing /movies fires auth-gated
        // queries that 401 and land here — a blanket clear() kept wiping the
        // public peak-users stat off the chrome every time that happened.
        queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] !== "peak-users",
        });
      }),
    [queryClient],
  );

  const checkPhoneExists = async (phone: string) => {
    const { exists } = await authService.checkPhoneExists(phone);
    return exists;
  };

  const verifyPassword = async (phone: string, password: string) => {
    await authService.verifyPhonePassword(phone, password);
  };

  const requestOtp = async (phone: string) => {
    await authService.requestOtp(phone);
  };

  const verifyOtp = async (phone: string, code: string, password?: string) => {
    const { accessToken, refreshToken } = await authService.verifyOtp(phone, code, password);
    tokenStore.setTokens(accessToken, refreshToken);
    connectSocket(accessToken);
    await loadProfile();
  };

  const logout = () => {
    const refreshToken = tokenStore.getRefreshToken();
    tokenStore.clear();
    setUser(null);
    disconnectSocket();
    // Same reasoning as the onUnauthorized handler — a stale wallet balance,
    // subscription-plans list, etc. must not survive into the next session
    // on this browser (whether that's a guest view or a different account).
    queryClient.clear();
    if (refreshToken) authService.logout(refreshToken).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        checkPhoneExists,
        verifyPassword,
        requestOtp,
        verifyOtp,
        logout,
        refreshProfile: loadProfile,
        updateUser: setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
