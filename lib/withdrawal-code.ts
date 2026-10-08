import { ApiError } from "@/services/api/apiClient";
import { authErrorMessage } from "@/lib/auth/auth-errors";
import type { Language, TranslationShape } from "@/lib/i18n/translations";

/**
 * The 6-digit withdrawal code's client-side rules. They only make the form
 * friendlier (refuse a too-easy or mismatched code before a round trip);
 * the server repeats every check and its verdict is the one that counts.
 * Same rules as backend/src/withdrawal-code/withdrawal-code.rules.ts and the
 * approved design (docs/withdrawal-code-2026-10-05/design).
 */

export const WITHDRAWAL_CODE_LENGTH = 6;

/** The backend's refusal codes (ApiError.code). Branch on these, never on the English message. */
export const WITHDRAWAL_CODE_ERRORS = {
  NOT_SET: "WITHDRAWAL_CODE_NOT_SET",
  ALREADY_SET: "WITHDRAWAL_CODE_ALREADY_SET",
  REQUIRED: "WITHDRAWAL_CODE_REQUIRED",
  INVALID_FORMAT: "WITHDRAWAL_CODE_INVALID_FORMAT",
  WRONG: "WITHDRAWAL_CODE_WRONG",
  LOCKED: "WITHDRAWAL_CODE_LOCKED",
  TOO_EASY: "WITHDRAWAL_CODE_TOO_EASY",
  MISMATCH: "WITHDRAWAL_CODE_MISMATCH",
  SAME: "WITHDRAWAL_CODE_SAME",
  RESET_NO_PHONE: "WITHDRAWAL_CODE_RESET_NO_PHONE",
  RESET_SMS_INVALID: "WITHDRAWAL_CODE_RESET_SMS_INVALID",
  RESET_SMS_TOO_MANY: "WITHDRAWAL_CODE_RESET_SMS_TOO_MANY",
  RESET_EXPIRED: "WITHDRAWAL_CODE_RESET_EXPIRED",
} as const;

export type WithdrawalCodeErrorCode =
  (typeof WITHDRAWAL_CODE_ERRORS)[keyof typeof WITHDRAWAL_CODE_ERRORS];

const KNOWN_CODES = new Set<string>(Object.values(WITHDRAWAL_CODE_ERRORS));

/** The WITHDRAWAL_CODE_* reason of a failed call, or null for any other failure. */
export function withdrawalCodeErrorOf(err: unknown): WithdrawalCodeErrorCode | null {
  if (!(err instanceof ApiError) || !err.code || !KNOWN_CODES.has(err.code)) return null;
  return err.code as WithdrawalCodeErrorCode;
}

/** U+1040..U+1049 — the digits a Burmese keyboard types. */
const MYANMAR_ZERO = 0x1040;

/**
 * What a code field keeps of whatever was typed or pasted: Myanmar digits
 * ၀-၉ turned into 0-9, everything else that is not a digit dropped (a pasted
 * "MyanFlix: 482 913" becomes "482913"), at most 6 digits.
 */
export function cleanCodeInput(raw: string): string {
  return raw
    .replace(/[၀-၉]/g, (digit) => String(digit.charCodeAt(0) - MYANMAR_ZERO))
    .replace(/\D/g, "")
    .slice(0, WITHDRAWAL_CODE_LENGTH);
}

/**
 * True for the codes the design refuses as too easy to guess: one digit six
 * times (111111), a straight run up or down (123456, 987654, 567890, 098765),
 * one pair three times (121212) and one group of three twice (123123).
 */
export function isTooEasyWithdrawalCode(code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  if (/^(\d)\1{5}$/.test(code)) return true;
  if ("01234567890".includes(code) || "09876543210".includes(code)) return true;
  if (/^(\d\d)\1\1$/.test(code) || /^(\d\d\d)\1$/.test(code)) return true;
  return false;
}

/** Whole minutes (rounded up, at least 1) until `until` (ms since epoch). */
export function minutesUntil(until: number, now: number): number {
  return Math.max(1, Math.ceil((until - now) / 60_000));
}

/** How long the server locks the code after 5 wrong tries in a row. */
export const WITHDRAWAL_CODE_LOCK_MINUTES = 15;
const LOCK_MS = WITHDRAWAL_CODE_LOCK_MINUTES * 60_000;

/**
 * When a lock ends on this computer's clock: the server's `lockedUntil`, but
 * never more than 15 minutes from now — a computer whose clock runs behind
 * the server's would otherwise read "Try again in 75 minutes" and keep the
 * field off that long. Null when there is no lock or it has already ended.
 * Same rule as the app (mobile codeRules.ts lockEnd).
 */
export function lockEndFromIso(iso: string | null | undefined, now: number): number | null {
  const until = iso ? Date.parse(iso) : Number.NaN;
  if (!Number.isFinite(until) || until <= now) return null;
  return Math.min(until, now + LOCK_MS);
}

/**
 * A lock's end as a clock time in the reader's language: "2:35 PM" in
 * English, "14:35" in Burmese (no English AM/PM inside a Burmese sentence;
 * Latin digits, like every other number on the site).
 */
export function formatLockTime(ms: number, language: Language): string {
  return language === "mm"
    ? new Date(ms).toLocaleTimeString("my-MM-u-nu-latn", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
    : new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * The account phone as the design shows it — "09 •••• ••• 471": the local
 * 09 prefix and the last three digits, the rest hidden. The server keeps
 * phones as +959…; null when there is no usable number.
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("95") ? `0${digits.slice(2)}` : digits;
  if (local.length < 7) return null;
  return `${local.slice(0, 2)} •••• ••• ${local.slice(-3)}`;
}

/** The 409 the OTP service answers inside its 60 s resend wait — the code already sent still works. */
const RESEND_COOLDOWN_MESSAGE = "Please wait before requesting another code";

export function isResendCooldown(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409 && err.message === RESEND_COOLDOWN_MESSAGE;
}

/**
 * One sentence, in the reader's language, for any failed withdrawal-code
 * call. Coded refusals are chosen by `code`; the SMS/OTP refusals the reset
 * request shares with sign-in (resend wait, hourly cap, SMS down), the rate
 * limit and "no connection" fall through to the sign-in flow's own mapping.
 */
export function withdrawalCodeErrorText(err: unknown, t: TranslationShape, now: number): string {
  const e = t.withdrawalCode.errors;
  switch (withdrawalCodeErrorOf(err)) {
    case WITHDRAWAL_CODE_ERRORS.NOT_SET:
      return e.notSet;
    case WITHDRAWAL_CODE_ERRORS.ALREADY_SET:
      return e.alreadySet;
    case WITHDRAWAL_CODE_ERRORS.REQUIRED:
      return e.required;
    case WITHDRAWAL_CODE_ERRORS.INVALID_FORMAT:
      return e.invalidFormat;
    case WITHDRAWAL_CODE_ERRORS.WRONG:
      return e.wrong((err as ApiError).triesLeft ?? 1);
    case WITHDRAWAL_CODE_ERRORS.LOCKED: {
      const end = lockEndFromIso((err as ApiError).lockedUntil, now);
      return e.locked(end === null ? WITHDRAWAL_CODE_LOCK_MINUTES : minutesUntil(end, now));
    }
    case WITHDRAWAL_CODE_ERRORS.TOO_EASY:
      return e.tooEasy;
    case WITHDRAWAL_CODE_ERRORS.MISMATCH:
      return e.mismatch;
    case WITHDRAWAL_CODE_ERRORS.SAME:
      return e.same;
    case WITHDRAWAL_CODE_ERRORS.RESET_NO_PHONE:
      return e.noPhone;
    case WITHDRAWAL_CODE_ERRORS.RESET_SMS_INVALID:
      return e.smsInvalid;
    case WITHDRAWAL_CODE_ERRORS.RESET_SMS_TOO_MANY:
      return e.smsTooMany;
    case WITHDRAWAL_CODE_ERRORS.RESET_EXPIRED:
      return e.resetExpired;
    default:
      return authErrorMessage(err, t);
  }
}
