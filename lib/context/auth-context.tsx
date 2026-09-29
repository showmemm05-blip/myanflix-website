"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  authService,
  type GoogleLoginInput,
  type OtpPurpose,
  type OtpVerifyProof,
} from "@/services/api/authService";
import { profileService } from "@/services/api/profileService";
import { ApiError } from "@/services/api/apiClient";
import { tokenStore, onUnauthorized, onTokensChanged } from "@/lib/auth/token-store";
import { isTransientStatus } from "@/lib/auth/session-errors";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { AppUser } from "@/types/user";

/**
 * H-20: when the profile cannot be fetched at boot because the server is
 * unreachable, the session is kept and the fetch retried — first after
 * this long, doubling up to the cap, and at once when the browser says it
 * is back online.
 */
const BOOT_RETRY_BASE_MS = 2_000;
const BOOT_RETRY_MAX_MS = 30_000;

interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Step 1: does an account already exist for this phone? */
  checkPhoneExists: (phone: string) => Promise<boolean>;
  /**
   * Step 2 (returning phone): throws on a wrong password. Resolves with the
   * step token step 3 must send (H-6) — the caller keeps it in memory only.
   */
  verifyPassword: (phone: string, password: string) => Promise<string>;
  /**
   * Step 3: requests a code for `phone` — throws (e.g. cooldown/rate-limit) on
   * failure. Sign-in leaves `purpose` out; forgot password passes
   * "password_reset", the only kind of code resetPassword accepts.
   */
  requestOtp: (phone: string, purpose?: OtpPurpose) => Promise<void>;
  /**
   * Step 3: verifies the code, logging into the existing account (proof =
   * the step token) or creating one (proof = the chosen password).
   */
  verifyOtp: (phone: string, code: string, proof: OtpVerifyProof) => Promise<void>;
  /** Forgot password (H-8): code from requestOtp(phone, "password_reset") + the new password. Opens no session. */
  resetPassword: (phone: string, code: string, newPassword: string) => Promise<void>;
  /** Google: exchanges a popup auth code (or a GIS ID token) for a session — same tail as verifyOtp. */
  loginWithGoogle: (input: GoogleLoginInput) => Promise<void>;
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

  /**
   * Fetches the profile. Resolves false when the server could not be
   * reached (offline, timeout, 429, 5xx): the tokens are then left alone
   * (H-20) — that says nothing about the session. Any real answer (a 401
   * after apiClient's single-flight refresh was refused, a 404, ...) ends
   * the session as before.
   */
  const loadProfile = async (): Promise<boolean> => {
    try {
      const profile = await profileService.getProfile();
      setUser(profile);
      return true;
    } catch (err) {
      if (err instanceof ApiError && isTransientStatus(err.status)) return false;
      tokenStore.clear();
      setUser(null);
      return true;
    }
  };

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    // Session restore. While the server is unreachable the app stays in
    // its loading state (protected pages keep their loader instead of
    // bouncing to /login) and keeps trying, so a backend restart or a weak
    // signal at launch never costs the user a new password + SMS sign-in.
    const restore = async () => {
      const settled = tokenStore.getAccessToken()
        ? await loadProfile()
        : true;
      if (cancelled) return;
      if (settled) {
        setIsLoading(false);
        return;
      }
      attempt += 1;
      const delay = Math.min(
        BOOT_RETRY_MAX_MS,
        BOOT_RETRY_BASE_MS * 2 ** (attempt - 1),
      );
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void restore();
      }, delay);
    };

    // Only while a retry is waiting — never on top of one in flight.
    const retryNow = () => {
      if (retryTimer === undefined) return;
      clearTimeout(retryTimer);
      retryTimer = undefined;
      void restore();
    };

    const accessToken = tokenStore.getAccessToken();
    if (accessToken) connectSocket(accessToken);
    window.addEventListener("online", retryNow);
    void restore();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      window.removeEventListener("online", retryNow);
    };
  }, []);

  // Closes the refresh gap: apiClient rotates the access token every ~15
  // minutes on the first 401 it sees, and the socket must re-handshake with
  // the new one or the gateway rejects its next reconnect ("jwt expired") and
  // live wallet/notification updates silently stop. connectSocket() is a
  // no-op when the token is unchanged, so this coexists with the explicit
  // mount/login/logout calls; a clear() (null) tears the socket down.
  useEffect(
    () =>
      onTokensChanged((accessToken) => {
        if (accessToken) connectSocket(accessToken);
        else disconnectSocket();
      }),
    [],
  );

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
    const { stepToken } = await authService.verifyPhonePassword(phone, password);
    return stepToken;
  };

  const requestOtp = async (phone: string, purpose?: OtpPurpose) => {
    await authService.requestOtp(phone, purpose);
  };

  const verifyOtp = async (phone: string, code: string, proof: OtpVerifyProof) => {
    const { accessToken, refreshToken } = await authService.verifyOtp(phone, code, proof);
    tokenStore.setTokens(accessToken, refreshToken);
    connectSocket(accessToken);
    await loadProfile();
  };

  const resetPassword = async (phone: string, code: string, newPassword: string) => {
    await authService.resetPassword(phone, code, newPassword);
  };

  const loginWithGoogle = async (input: GoogleLoginInput) => {
    const { accessToken, refreshToken } = await authService.loginWithGoogle(input);
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
        resetPassword,
        loginWithGoogle,
        logout,
        refreshProfile: async () => {
          await loadProfile();
        },
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
