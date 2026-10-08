import { apiClient } from "./apiClient";

/**
 * The signed-in account's own 6-digit withdrawal code (approved 2026-10-05).
 * The server keeps only a scrambled copy and is the judge of every check —
 * nothing here (or anywhere on the site) stores the code.
 *
 * Refusals arrive as an ApiError with a WITHDRAWAL_CODE_* `code`; see
 * lib/withdrawal-code.ts for the list and their texts.
 */
export interface WithdrawalCodeStatus {
  hasCode: boolean;
  /** ISO time the code opens again after 5 wrong tries in a row; null when not locked. */
  lockedUntil: string | null;
  /** 0..5 — 0 while locked, 5 when there is no code. */
  triesLeft: number;
  maxTries: number;
  /** false = the account has no phone, so "Forgot code?" can't text it. */
  canResetBySms: boolean;
}

export interface WithdrawalCodeResetRequest {
  sent: boolean;
  resendAfterSeconds: number;
  expiresInSeconds: number;
}

export interface WithdrawalCodeResetToken {
  /** Single-use, 10 minutes — proof the SMS step was passed. Memory only. */
  resetToken: string;
  expiresInSeconds: number;
}

/** React Query key for GET /users/me/withdrawal-code. */
export const WITHDRAWAL_CODE_STATUS_KEY = ["withdrawal-code", "status"] as const;

const BASE = "/users/me/withdrawal-code";

export const withdrawalCodeService = {
  getStatus(): Promise<WithdrawalCodeStatus> {
    return apiClient.get<WithdrawalCodeStatus>(BASE);
  },

  /** The first code (409 WITHDRAWAL_CODE_ALREADY_SET when one exists). */
  create(code: string, confirm: string): Promise<WithdrawalCodeStatus> {
    return apiClient.post<WithdrawalCodeStatus>(BASE, { code, confirm });
  },

  /** "Is this my current code?" — step 1 of Change. Counts toward the 5-try lock. */
  verify(code: string): Promise<WithdrawalCodeStatus> {
    return apiClient.post<WithdrawalCodeStatus>(`${BASE}/verify`, { code });
  },

  change(currentCode: string, newCode: string, confirm: string): Promise<WithdrawalCodeStatus> {
    return apiClient.put<WithdrawalCodeStatus>(BASE, { currentCode, newCode, confirm });
  },

  /** "Forgot code?" — texts "MyanFlix: 482 913" to the account phone. */
  requestReset(): Promise<WithdrawalCodeResetRequest> {
    return apiClient.post<WithdrawalCodeResetRequest>(`${BASE}/reset/request`, {});
  },

  /** Checks (and spends) the SMS code; answers with the token reset/confirm needs. */
  verifyReset(otpCode: string): Promise<WithdrawalCodeResetToken> {
    return apiClient.post<WithdrawalCodeResetToken>(`${BASE}/reset/verify`, { otpCode });
  },

  /** Sets the new code and clears the lock. */
  confirmReset(resetToken: string, newCode: string, confirm: string): Promise<WithdrawalCodeStatus> {
    return apiClient.post<WithdrawalCodeStatus>(`${BASE}/reset/confirm`, {
      resetToken,
      newCode,
      confirm,
    });
  },
};
