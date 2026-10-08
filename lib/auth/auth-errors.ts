import { ApiError } from "@/services/api/apiClient";
import {
  SMS_UNAVAILABLE_MESSAGE,
  STEP_TOKEN_REFUSED_MESSAGE,
} from "@/services/api/authService";
import type { TranslationShape } from "@/lib/i18n/translations";

/**
 * The backend's sign-in / reset sentences this app shows in the reader's own
 * language. Keyed by the exact message the API sends; anything not listed
 * is shown as the server wrote it (it usually names the problem).
 */
const KNOWN_AUTH_MESSAGES: Record<string, (t: TranslationShape) => string> = {
  "Invalid or expired code": (t) => t.auth.errors.invalidCode,
  "Too many incorrect attempts — request a new code": (t) =>
    t.auth.errors.tooManyAttempts,
  "Please wait before requesting another code": (t) => t.auth.errors.codeCooldown,
  "Too many code requests — please try again later": (t) =>
    t.auth.errors.tooManyCodeRequests,
  "This account is no longer active": (t) => t.auth.errors.accountInactive,
  "No account was found for this phone number.": (t) =>
    t.auth.errors.noAccountForPhone,
  [STEP_TOKEN_REFUSED_MESSAGE]: (t) => t.auth.passwordAgain,
  // 503 from a code request (sign-in, resend, forgot password): the SMS
  // gateway phone is offline or the day's SMS cap is reached.
  [SMS_UNAVAILABLE_MESSAGE]: (t) => t.auth.errors.smsUnavailable,
};

/** One user-facing sentence for a failed auth call. */
export function authErrorMessage(err: unknown, t: TranslationShape): string {
  if (!(err instanceof ApiError)) return t.auth.genericError;
  const known = KNOWN_AUTH_MESSAGES[err.message];
  if (known) return known(t);
  // No answer at all (offline, timeout, DNS) — the client reports status 0.
  if (err.status === 0) return t.auth.errors.network;
  // The HTTP rate limit's own English sentence names a wait in seconds.
  if (err.status === 429) return t.auth.errors.rateLimited;
  return err.message || t.auth.genericError;
}

/** H-6: the code step's proof of the password step was refused — redo the password. */
export function isStepTokenRefusal(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 401 &&
    err.message === STEP_TOKEN_REFUSED_MESSAGE
  );
}
