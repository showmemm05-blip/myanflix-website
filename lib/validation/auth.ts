import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";

/**
 * The sign-in / sign-up / forgot-password form checks.
 *
 * These are plain react-hook-form resolvers (no schema library): the rules
 * are a handful of length and pattern checks, and pulling in a full schema
 * library for them cost the auth pages roughly 80 KB of JavaScript. The
 * limits and the English messages are exactly the ones the old schemas used —
 * lib/i18n/sections/auth.ts translates each message by its exact text, so do
 * not reword one without updating that table. The server's DTOs remain the
 * real gate; these checks only catch mistakes before a round trip.
 *
 * Each field reports only its FIRST failing rule, in the order listed, which
 * is what the old resolver showed.
 */

/** One rule: returns the error message when the value fails, else undefined. */
type Rule = (value: string) => string | undefined;

const required =
  (message: string): Rule =>
  (value) =>
    value.length < 1 ? message : undefined;
const minLength =
  (min: number, message: string): Rule =>
  (value) =>
    value.length < min ? message : undefined;
const maxLength =
  (max: number, message: string): Rule =>
  (value) =>
    value.length > max ? message : undefined;
const exactLength =
  (length: number, message: string): Rule =>
  (value) =>
    value.length !== length ? message : undefined;
const pattern =
  (regex: RegExp, message: string): Rule =>
  (value) =>
    regex.test(value) ? undefined : message;

/** The first failing rule's message for one field, or undefined. */
function firstError(value: unknown, rules: Rule[]): string | undefined {
  const text = typeof value === "string" ? value : "";
  for (const rule of rules) {
    const message = rule(text);
    if (message) return message;
  }
  return undefined;
}

type FieldRules<T> = { [K in keyof T]: Rule[] };

/** A cross-field check (e.g. "the two passwords match"). */
type FormCheck<T> = { field: keyof T; message: string; ok: (values: T) => boolean };

function buildResolver<T extends FieldValues>(
  fields: FieldRules<T>,
  checks: FormCheck<T>[] = [],
): Resolver<T> {
  return async (values) => {
    const errors: Record<string, { type: string; message: string }> = {};
    for (const name of Object.keys(fields) as (keyof T & string)[]) {
      const message = firstError(values[name], fields[name]);
      if (message) errors[name] = { type: "validate", message };
    }
    // Cross-field checks run even when a field rule failed (so "Passwords
    // don't match" can show next to "at least 8 characters"), but never
    // replace a field's own first error.
    const allText = Object.keys(fields).every((name) => typeof values[name] === "string");
    if (allText) {
      for (const check of checks) {
        const name = check.field as string;
        if (!errors[name] && !check.ok(values)) {
          errors[name] = { type: "validate", message: check.message };
        }
      }
    }
    if (Object.keys(errors).length > 0) {
      return { values: {}, errors: errors as FieldErrors<T> };
    }
    return { values, errors: {} };
  };
}

// --- The rules (same limits and messages as before) -------------------------

const PHONE_RULES: Rule[] = [
  required("Phone number is required"),
  pattern(/^\+?[0-9]{7,15}$/, "Enter a valid phone number"),
];

const CODE_RULES: Rule[] = [
  required("Enter the code"),
  exactLength(6, "Enter the 6-digit code"),
  pattern(/^\d{6}$/, "Code must be 6 digits"),
];

const NEW_PASSWORD_RULES: Rule[] = [minLength(8, "Password must be at least 8 characters")];

const CONFIRM_RULES: Rule[] = [required("Please confirm your password")];

const passwordsMatch = <T extends { password: string; confirmPassword: string }>(): FormCheck<T> => ({
  field: "confirmPassword",
  message: "Passwords don't match",
  ok: (values) => values.password === values.confirmPassword,
});

// --- Forms --------------------------------------------------------------------

export type PhoneValues = { phone: string };
export const phoneResolver = buildResolver<PhoneValues>({ phone: PHONE_RULES });

export type OtpCodeValues = { code: string };
export const otpCodeResolver = buildResolver<OtpCodeValues>({ code: CODE_RULES });

/** A returning phone — just needs whatever password they already set. */
export type LoginPasswordValues = { password: string };
export const loginPasswordResolver = buildResolver<LoginPasswordValues>({
  password: [required("Password is required")],
});

/** A new phone — choosing the password that account will use going forward. */
export type CreatePasswordValues = { password: string; confirmPassword: string };
export const createPasswordResolver = buildResolver<CreatePasswordValues>(
  { password: NEW_PASSWORD_RULES, confirmPassword: CONFIRM_RULES },
  [passwordsMatch<CreatePasswordValues>()],
);

/**
 * Forgot password (H-8): the code that was sent, plus the new password — the
 * same rules as signup, plus the 72-character cap POST /auth/password/reset
 * enforces (so a longer one is caught here, not as a raw server error).
 */
export type ResetPasswordValues = { code: string; password: string; confirmPassword: string };
export const resetPasswordResolver = buildResolver<ResetPasswordValues>(
  {
    code: CODE_RULES,
    password: [...NEW_PASSWORD_RULES, maxLength(72, "Password must be 72 characters or fewer")],
    confirmPassword: CONFIRM_RULES,
  },
  [passwordsMatch<ResetPasswordValues>()],
);
