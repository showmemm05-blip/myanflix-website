"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Lock, Loader2, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Surface } from "@/components/system";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { ApiError } from "@/services/api/apiClient";
import { cn } from "@/lib/utils";
import {
  phoneSchema,
  otpCodeSchema,
  loginPasswordSchema,
  createPasswordSchema,
  type PhoneValues,
  type OtpCodeValues,
  type LoginPasswordValues,
  type CreatePasswordValues,
} from "@/lib/validation/auth";

const RESEND_COOLDOWN_SECONDS = 60;

const fieldClasses = "h-11 rounded-xl border-white/10 bg-white/[0.04] px-3.5";
/** Same field, with room carved out for the leading affordance icon. */
const iconFieldClasses = cn(fieldClasses, "pl-10");
const iconClasses = "pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground";
const submitClasses = "mt-1 h-11 w-full rounded-full text-sm font-semibold";
// The negative margin keeps the comfortable tap area from stretching the row.
const linkButtonClasses =
  "focus-ring -my-1 shrink-0 rounded-md px-1 py-2 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors duration-150 ease-out hover:text-foreground hover:underline";
const errorTextClasses = "text-xs text-destructive";

/**
 * Three segments: completed reads violet, the current one carries the aurora
 * gradient, upcoming stays a hairline. The labels underneath are the same
 * eyebrow treatment used everywhere else in the app.
 */
function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="flex items-start gap-2">
      {labels.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? "step" : undefined}
          className="flex flex-1 flex-col gap-1.5"
        >
          <span
            className={cn(
              "h-1 rounded-full transition-colors duration-300 ease-out",
              index < current
                ? "bg-primary/70"
                : index === current
                  ? "bg-gradient-to-r from-primary to-info"
                  : "bg-white/10",
            )}
          />
          <span
            className={cn(
              "text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors duration-300 ease-out",
              index === current
                ? "text-foreground"
                : index < current
                  ? "text-primary"
                  : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The one and only sign-in surface — login and signup share this same
 * three-step flow, branching only at the password step: an existing phone
 * enters its password, a new phone creates one. Either way the OTP step at
 * the end is what actually creates the session — login and signup are the
 * same backend call (verifying the code either logs into the existing
 * account or creates one), so /login and /register both just render this.
 */
export function PhoneAuthForm() {
  const { checkPhoneExists, verifyPassword, requestOtp, verifyOtp } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState<"phone" | "password" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [isNewAccount, setIsNewAccount] = useState(false);
  // Only meaningful for a new account — carried forward to the final OTP
  // verify call, since that's the moment the account actually gets created.
  const [pendingPassword, setPendingPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const phoneForm = useForm<PhoneValues>({ resolver: zodResolver(phoneSchema) });
  const loginPasswordForm = useForm<LoginPasswordValues>({ resolver: zodResolver(loginPasswordSchema) });
  const createPasswordForm = useForm<CreatePasswordValues>({ resolver: zodResolver(createPasswordSchema) });
  const codeForm = useForm<OtpCodeValues>({ resolver: zodResolver(otpCodeSchema) });

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

  // Password managers (browser-native or extensions like 1Password/Bitwarden)
  // can mistake the code field for a continuation of the login form right
  // after the password step submits, and autofill the just-typed password
  // into it — codeForm.reset() before this input even exists doesn't help,
  // since the autofill happens after mount. Force it empty once mounted.
  useEffect(() => {
    if (step === "code") codeForm.setValue("code", "");
    // codeForm is a stable useForm() instance — omitting it avoids re-running this on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const onSubmitPhone = async (values: PhoneValues) => {
    setError(null);
    try {
      const exists = await checkPhoneExists(values.phone);
      setPhone(values.phone);
      setIsNewAccount(!exists);
      setStep("password");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.auth.genericError);
    }
  };

  const sendCode = async () => {
    try {
      await requestOtp(phone);
      setStep("code");
      startCooldown();
      codeForm.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.auth.genericError);
    }
  };

  const onSubmitLoginPassword = async (values: LoginPasswordValues) => {
    setError(null);
    try {
      await verifyPassword(phone, values.password);
      await sendCode();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.auth.genericError);
    }
  };

  const onSubmitCreatePassword = async (values: CreatePasswordValues) => {
    setError(null);
    setPendingPassword(values.password);
    await sendCode();
  };

  const onResend = () => {
    if (cooldown > 0) return;
    sendCode();
  };

  const onSubmitCode = async (values: OtpCodeValues) => {
    setError(null);
    try {
      await verifyOtp(phone, values.code, isNewAccount ? pendingPassword : undefined);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.auth.genericError);
    }
  };

  const changePhone = () => {
    setStep("phone");
    setError(null);
    setCooldown(0);
    setPendingPassword("");
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    loginPasswordForm.reset();
    createPasswordForm.reset();
    codeForm.reset();
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

  /**
   * Which number this is all about, plus the way back out of it. Every step
   * past the first shows the same row, so "wrong number?" is answered in the
   * same place whether you're on the password step or the code step.
   */
  const identityRow = (message: string) => (
    <Surface
      tone="subtle"
      radius="lg"
      className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-3.5 py-3"
    >
      <p className="flex min-w-0 flex-1 items-start gap-2 text-sm text-muted-foreground">
        <Phone aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <span className="min-w-0">{message}</span>
      </p>
      <button type="button" onClick={changePhone} className={linkButtonClasses}>
        {t.auth.changePhone}
      </button>
    </Surface>
  );

  let form: ReactNode;

  if (step === "phone") {
    form = (
      <form onSubmit={phoneForm.handleSubmit(onSubmitPhone)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t.auth.phoneLabel}</Label>
          <div className="relative">
            <Phone aria-hidden className={iconClasses} />
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t.auth.phonePlaceholder}
              className={cn(iconFieldClasses, "nums")}
              {...phoneForm.register("phone")}
            />
          </div>
          {phoneForm.formState.errors.phone && (
            <p className={errorTextClasses}>{phoneForm.formState.errors.phone.message}</p>
          )}
        </div>
        <Button type="submit" disabled={phoneForm.formState.isSubmitting} className={submitClasses}>
          {phoneForm.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
          {t.auth.continue}
        </Button>
      </form>
    );
  } else if (step === "password" && isNewAccount) {
    form = (
      <form
        onSubmit={(event) => createPasswordForm.handleSubmit(onSubmitCreatePassword)(event)}
        className="flex flex-col gap-4"
      >
        {identityRow(t.auth.creatingAccountFor(phone))}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t.auth.newPasswordLabel}</Label>
          <div className="relative">
            <Lock aria-hidden className={iconClasses} />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={t.auth.newPasswordPlaceholder}
              className={iconFieldClasses}
              {...createPasswordForm.register("password")}
            />
          </div>
          {createPasswordForm.formState.errors.password && (
            <p className={errorTextClasses}>{createPasswordForm.formState.errors.password.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">{t.auth.confirmPasswordLabel}</Label>
          <div className="relative">
            <Lock aria-hidden className={iconClasses} />
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder={t.auth.confirmPasswordPlaceholder}
              className={iconFieldClasses}
              {...createPasswordForm.register("confirmPassword")}
            />
          </div>
          {createPasswordForm.formState.errors.confirmPassword && (
            <p className={errorTextClasses}>{createPasswordForm.formState.errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" disabled={createPasswordForm.formState.isSubmitting} className={submitClasses}>
          {createPasswordForm.formState.isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          {t.auth.continue}
        </Button>
      </form>
    );
  } else if (step === "password") {
    form = (
      <form
        onSubmit={(event) => loginPasswordForm.handleSubmit(onSubmitLoginPassword)(event)}
        className="flex flex-col gap-4"
      >
        {identityRow(t.auth.signingInAs(phone))}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t.auth.passwordLabel}</Label>
          <div className="relative">
            <Lock aria-hidden className={iconClasses} />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t.auth.passwordPlaceholder}
              className={iconFieldClasses}
              {...loginPasswordForm.register("password")}
            />
          </div>
          {loginPasswordForm.formState.errors.password && (
            <p className={errorTextClasses}>{loginPasswordForm.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" disabled={loginPasswordForm.formState.isSubmitting} className={submitClasses}>
          {loginPasswordForm.formState.isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          {t.auth.continue}
        </Button>
      </form>
    );
  } else {
    form = (
      <form onSubmit={codeForm.handleSubmit(onSubmitCode)} className="flex flex-col gap-4">
        {identityRow(t.auth.otpSent(phone))}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">{t.auth.otpLabel}</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className={cn(fieldClasses, "nums h-12 text-center text-lg tracking-[0.35em] md:text-lg")}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            {...codeForm.register("code")}
          />
          {codeForm.formState.errors.code && (
            <p className={cn(errorTextClasses, "text-center")}>{codeForm.formState.errors.code.message}</p>
          )}
        </div>
        <Button type="submit" disabled={codeForm.formState.isSubmitting} className={submitClasses}>
          {codeForm.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {isNewAccount ? t.auth.verifyAndCreate : t.auth.verifyAndSignIn}
        </Button>
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0}
          className="focus-ring nums self-center rounded-full px-3 py-2.5 text-sm font-medium text-primary transition-colors duration-150 ease-out hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? t.auth.resendIn(cooldown) : t.auth.resendCode}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator
        current={step === "phone" ? 0 : step === "password" ? 1 : 2}
        labels={[t.auth.stepPhone, t.auth.stepPassword, t.auth.stepVerify]}
      />
      {errorRow}
      {form}
    </div>
  );
}
