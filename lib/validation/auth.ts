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
