import { z } from "zod";

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number"),
});
export type PhoneValues = z.infer<typeof phoneSchema>;

export const otpCodeSchema = z.object({
  code: z
    .string()
    .min(1, "Enter the code")
    .length(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "Code must be 6 digits"),
});
export type OtpCodeValues = z.infer<typeof otpCodeSchema>;

/** A returning phone — just needs whatever password they already set. */
export const loginPasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
export type LoginPasswordValues = z.infer<typeof loginPasswordSchema>;

/** A new phone — choosing the password that account will use going forward. */
export const createPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type CreatePasswordValues = z.infer<typeof createPasswordSchema>;

/**
 * Forgot password (H-8): the code that was sent, plus the new password — the
 * same rules as signup, plus the 72-character cap POST /auth/password/reset
 * enforces (so a longer one is caught here, not as a raw server error).
 */
export const resetPasswordSchema = z
  .object({
    code: otpCodeSchema.shape.code,
    password: createPasswordSchema.shape.password.max(
      72,
      "Password must be 72 characters or fewer",
    ),
    confirmPassword: createPasswordSchema.shape.confirmPassword,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
