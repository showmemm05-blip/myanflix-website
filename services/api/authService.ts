import { apiClient } from "./apiClient";
import type { UserRole } from "@/types/user";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type OtpVerifyResponse = { user: AuthUser } & AuthTokens;

/**
 * Exactly one of the two, as the backend demands: `code` is the one-time
 * authorization code from Google's popup (exchanged and verified
 * server-side); `credential` is a GIS ID token (kept for the older button /
 * One Tap path).
 */
export type GoogleLoginInput = { credential?: string; code?: string };

export const authService = {
  checkPhoneExists(phone: string) {
    return apiClient.post<{ exists: boolean }>("/auth/phone/check", { phone }, { skipAuth: true });
  },

  verifyPhonePassword(phone: string, password: string) {
    return apiClient.post<{ valid: boolean }>("/auth/phone/verify-password", { phone, password }, { skipAuth: true });
  },

  requestOtp(phone: string) {
    return apiClient.post<{ sent: boolean }>("/auth/otp/request", { phone }, { skipAuth: true });
  },

  /** `password` is only meaningful (and required by the backend) when this phone has no account yet. */
  verifyOtp(phone: string, code: string, password?: string) {
    return apiClient.post<OtpVerifyResponse>("/auth/otp/verify", { phone, code, password }, { skipAuth: true });
  },

  /** Google code / ID token → session; the backend exchanges and verifies signature/expiry/audience itself. */
  loginWithGoogle(input: GoogleLoginInput) {
    return apiClient.post<OtpVerifyResponse>("/auth/google", input, { skipAuth: true });
  },

  logout(refreshToken: string) {
    return apiClient.post<{ loggedOut: boolean }>("/auth/logout", { refreshToken }, { skipAuth: true });
  },
};
