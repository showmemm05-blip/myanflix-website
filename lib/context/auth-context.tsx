"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authService } from "@/services/api/authService";
import { profileService } from "@/services/api/profileService";
import { tokenStore, onUnauthorized } from "@/lib/auth/token-store";
import type { AppUser } from "@/types/user";

interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    const hasToken = Boolean(tokenStore.getAccessToken());
    if (!hasToken) {
      setIsLoading(false);
      return;
    }
    loadProfile().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => onUnauthorized(() => setUser(null)), []);

  const login = async (email: string, password: string) => {
    const { accessToken, refreshToken } = await authService.login(
      email,
      password,
    );
    tokenStore.setTokens(accessToken, refreshToken);
    await loadProfile();
  };

  const register = async (name: string, email: string, password: string) => {
    const { accessToken, refreshToken } = await authService.register(
      name,
      email,
      password,
    );
    tokenStore.setTokens(accessToken, refreshToken);
    await loadProfile();
  };

  const logout = () => {
    const refreshToken = tokenStore.getRefreshToken();
    tokenStore.clear();
    setUser(null);
    if (refreshToken) authService.logout(refreshToken).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        refreshProfile: loadProfile,
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
