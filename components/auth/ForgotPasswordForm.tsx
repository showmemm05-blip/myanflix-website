"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  MessageSquareText,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Surface } from "@/components/system";
import {
  RESEND_COOLDOWN_SECONDS,
  errorTextClasses,
  fieldClasses,
  iconClasses,
  iconFieldClasses,
  linkButtonClasses,
  submitClasses,
} from "@/components/auth/PhoneAuthForm";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { authErrorMessage } from "@/lib/auth/auth-errors";
import { handedOffPhoneOrEmpty, handOffPhone } from "@/lib/auth/phone-handoff";
import { loginHref } from "@/lib/auth/return-to";
import { cn } from "@/lib/utils";
import {
  phoneSchema,
  resetPasswordSchema,
  type PhoneValues,
  type ResetPasswordValues,
} from "@/lib/validation/auth";

/**
 * "Forgot password?" (H-8), on the sign-in flow's own code service:
 * phone → a reset code (POST /auth/otp/request with purpose
 * "password_reset") → the code plus a new password (POST
 * /auth/password/reset). The reset opens no session and signs the account
 * out everywhere, so it ends on "sign in with your new password" — the
 * normal password-then-code sign-in, number carried over.
 *
 * Codes are only requested, never said to be "sent": SMS delivery is not
 * switched on yet (C-2).
 */
export function ForgotPasswordForm({ returnTo }: { returnTo?: string | null } = {}) {
  const { requestOtp, resetPassword } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const phoneForm = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    // Arrived from the sign-in password step: the number is already known.
    defaultValues: { phone: handedOffPhoneOrEmpty() },
  });
  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    cooldownInterval.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownInterval.current) clearInterval(cooldownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    };
  }, []);

  const onSubmitPhone = async (values: PhoneValues) => {
    setError(null);
    try {
      // A number with no customer account (staff included), or whose account
      // is suspended, banned or closed, is refused here before any code
      // exists; so is a second request inside the 60 s wait. authErrorMessage
      // shows each refusal translated, and the page stays on this step.
      await requestOtp(values.phone, "password_reset");
      setPhone(values.phone);
      startCooldown();
      resetForm.reset();
      setStep("code");
    } catch (err) {
      setError(authErrorMessage(err, t));
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setResending(true);
    try {
      await requestOtp(phone, "password_reset");
      startCooldown();
    } catch (err) {
      setError(authErrorMessage(err, t));
    } finally {
      setResending(false);
    }
  };

  const onSubmitReset = async (values: ResetPasswordValues) => {
    setError(null);
    try {
      await resetPassword(phone, values.code, values.password);
      // The sign-in form opens with this number already filled in.
      handOffPhone(phone);
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
      setStep("done");
    } catch (err) {
      setError(authErrorMessage(err, t));
    }
  };

  const changePhone = () => {
    setStep("phone");
    setError(null);
    setCooldown(0);
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    resetForm.reset();
  };

  const errorRow = error ? (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-3.5 py-3 text-sm text-destructive ring-1 ring-destructive/25 ring-inset"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{error}</p>
    </div>
  ) : null;

  if (step === "done") {
    return (
      <div className="flex flex-col gap-5">
        <Surface
          tone="subtle"
          radius="lg"
          className="flex items-start gap-3 px-4 py-4"
          role="status"
        >
          <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">{t.auth.reset.doneTitle}</p>
            <p className="text-sm text-muted-foreground">{t.auth.reset.doneBody}</p>
          </div>
        </Surface>
        <Button
          className={submitClasses}
          render={<Link href={returnTo ? loginHref(returnTo) : "/login"} />}
          nativeButton={false}
        >
          <Lock className="size-4" />
          {t.auth.signInLink}
        </Button>
      </div>
    );
  }

  if (step === "phone") {
    return (
      <div className="flex flex-col gap-4">
        {errorRow}
        <form
          onSubmit={(event) => phoneForm.handleSubmit(onSubmitPhone)(event)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-phone">{t.auth.phoneLabel}</Label>
            <div className="relative">
              <Phone aria-hidden className={iconClasses} />
              <Input
                id="reset-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t.auth.phonePlaceholder}
                className={cn(iconFieldClasses, "nums")}
                {...phoneForm.register("phone")}
              />
            </div>
            {phoneForm.formState.errors.phone && (
              <p className={errorTextClasses}>
                {phoneForm.formState.errors.phone.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={phoneForm.formState.isSubmitting}
            className={submitClasses}
          >
            {phoneForm.formState.isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquareText className="size-4" />
            )}
            {t.auth.reset.requestCode}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {errorRow}
      <form
        onSubmit={(event) => resetForm.handleSubmit(onSubmitReset)(event)}
        className="flex flex-col gap-4"
      >
        <Surface
          tone="subtle"
          radius="lg"
          className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-3.5 py-3"
        >
          <p className="flex min-w-0 flex-1 items-start gap-2 text-sm text-muted-foreground">
            <Phone aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span className="min-w-0">{t.auth.reset.codeRequested(phone)}</span>
          </p>
          <button type="button" onClick={changePhone} className={linkButtonClasses}>
            {t.auth.changePhone}
          </button>
        </Surface>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-code">{t.auth.otpLabel}</Label>
          <Input
            id="reset-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className={cn(
              fieldClasses,
              "nums h-12 text-center text-lg tracking-[0.35em] md:text-lg",
            )}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            {...resetForm.register("code")}
          />
          {resetForm.formState.errors.code && (
            <p className={cn(errorTextClasses, "text-center")}>
              {resetForm.formState.errors.code.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-password">{t.auth.reset.newPasswordLabel}</Label>
          <div className="relative">
            <Lock aria-hidden className={iconClasses} />
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              placeholder={t.auth.newPasswordPlaceholder}
              className={iconFieldClasses}
              {...resetForm.register("password")}
            />
          </div>
          {resetForm.formState.errors.password && (
            <p className={errorTextClasses}>
              {resetForm.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-confirm-password">{t.auth.confirmPasswordLabel}</Label>
          <div className="relative">
            <Lock aria-hidden className={iconClasses} />
            <Input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder={t.auth.confirmPasswordPlaceholder}
              className={iconFieldClasses}
              {...resetForm.register("confirmPassword")}
            />
          </div>
          {resetForm.formState.errors.confirmPassword && (
            <p className={errorTextClasses}>
              {resetForm.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={resetForm.formState.isSubmitting}
          className={submitClasses}
        >
          {resetForm.formState.isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <KeyRound className="size-4" />
          )}
          {t.auth.reset.submit}
        </Button>

        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="pill-sm"
            onClick={onResend}
            disabled={cooldown > 0 || resending}
            focusableWhenDisabled
            className="w-full font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
          >
            {resending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquareText className="size-4" />
            )}
            {resending ? t.auth.reset.requesting : t.auth.reset.requestAgain}
          </Button>
          <p className="nums min-h-4 text-center text-xs text-muted-foreground">
            {cooldown > 0 && !resending ? t.auth.resendIn(cooldown) : ""}
          </p>
        </div>
      </form>
    </div>
  );
}
