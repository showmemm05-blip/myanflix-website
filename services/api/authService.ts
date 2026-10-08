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

/**
 * What proves the step before the code (H-6). An existing account sends the
 * `stepToken` the password step handed out — the server refuses the code
 * without it. A brand-new phone sends the password it is being created with.
 */
export type OtpVerifyProof = { stepToken?: string; password?: string };

/**
 * The 401 POST /auth/otp/verify answers when the password step has to be
 * redone: the step token is missing, expired (10 minutes), for another
 * account, or the password changed since. Checked before the code, so the
 * code is not spent.
 */
export const STEP_TOKEN_REFUSED_MESSAGE = "Please enter your password again.";

/**
 * The 503 POST /auth/otp/request answers when the code cannot be handed to
 * the SMS gateway phone right now: the phone has not checked in lately, or
 * the day's SMS cap is used up. No code was kept, so the resend wait and the
 * hourly limit are not spent — asking again a little later is the cure.
 * Word for word the backend's text (sms.service.ts); it is the lookup key.
 */
export const SMS_UNAVAILABLE_MESSAGE =
  "SMS service is temporarily unavailable. Please try again shortly.";

/**
 * What a requested code is for. A sign-in code never resets a password and a
 * reset code never signs in — the server checks each code against the
 * purpose it was requested with.
 */
export type OtpPurpose = "login" | "password_reset";

export const authService = {
  checkPhoneExists(phone: string) {
    return apiClient.post<{ exists: boolean }>("/auth/phone/check", { phone }, { skipAuth: true });
  },

  /**
   * Step 2 for a returning phone. The `stepToken` is the proof step 3 must
   * present — keep it in memory only, never store it.
   */
  verifyPhonePassword(phone: string, password: string) {
    return apiClient.post<{ valid: boolean; stepToken: string }>(
      "/auth/phone/verify-password",
      { phone, password },
      { skipAuth: true },
    );
  },

  /**
   * Leave `purpose` out for sign-in (the server's default). With
   * "password_reset", a phone that has no customer account is refused (400
   * "No account was found for this phone number."), and one whose account is
   * suspended, banned or closed too (401 "This account is no longer active"),
   * both before any code exists. The 60 s wait (409 "Please wait before
   * requesting another code") is counted per purpose. A 503
   * SMS_UNAVAILABLE_MESSAGE means the SMS gateway could not take the code;
   * nothing was kept, so the user may simply ask again shortly. skipAuth keeps
   * the 401 away from the session-refresh path, so it reaches the form as is.
   */
  requestOtp(phone: string, purpose?: OtpPurpose) {
    return apiClient.post<{ sent: boolean }>(
      "/auth/otp/request",
      purpose ? { phone, purpose } : { phone },
      { skipAuth: true },
    );
  },

  verifyOtp(phone: string, code: string, proof: OtpVerifyProof = {}) {
    return apiClient.post<OtpVerifyResponse>(
      "/auth/otp/verify",
      { phone, code, ...proof },
      { skipAuth: true },
    );
  },

  /**
   * H-8 "forgot password": the code comes from requestOtp(phone,
   * "password_reset") — a sign-in code is refused here. Opens no session —
   * every session of the account is signed out and the user then signs in
   * normally with the new password.
   */
  resetPassword(phone: string, code: string, newPassword: string) {
    return apiClient.post<{ reset: boolean }>(
      "/auth/password/reset",
      { phone, code, newPassword },
      { skipAuth: true },
    );
  },

  /** Google code / ID token → session; the backend exchanges and verifies signature/expiry/audience itself. */
  loginWithGoogle(input: GoogleLoginInput) {
    return apiClient.post<OtpVerifyResponse>("/auth/google", input, { skipAuth: true });
  },

  logout(refreshToken: string) {
    return apiClient.post<{ loggedOut: boolean }>("/auth/logout", { refreshToken }, { skipAuth: true });
  },
};
