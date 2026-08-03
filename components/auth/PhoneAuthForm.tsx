"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Loader2, Phone, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/auth-context";
import { ApiError } from "@/services/api/apiClient";
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
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  const sendCode = async () => {
    try {
      await requestOtp(phone);
      setStep("code");
      startCooldown();
      codeForm.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  const onSubmitLoginPassword = async (values: LoginPasswordValues) => {
    setError(null);
    try {
      await verifyPassword(phone, values.password);
      await sendCode();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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

  if (step === "phone") {
    return (
      <form onSubmit={phoneForm.handleSubmit(onSubmitPhone)} className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="09xxxxxxxxx"
            {...phoneForm.register("phone")}
          />
          {phoneForm.formState.errors.phone && (
            <p className="text-xs text-destructive">{phoneForm.formState.errors.phone.message}</p>
          )}
        </div>
        <Button type="submit" disabled={phoneForm.formState.isSubmitting} className="mt-1">
          {phoneForm.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
          Continue
        </Button>
      </form>
    );
  }

  if (step === "password") {
    if (isNewAccount) {
      return (
        <form onSubmit={createPasswordForm.handleSubmit(onSubmitCreatePassword)} className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{phone}</span> isn&rsquo;t registered yet — create a
            password to continue.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...createPasswordForm.register("password")}
            />
            {createPasswordForm.formState.errors.password && (
              <p className="text-xs text-destructive">{createPasswordForm.formState.errors.password.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...createPasswordForm.register("confirmPassword")}
            />
            {createPasswordForm.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{createPasswordForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" disabled={createPasswordForm.formState.isSubmitting} className="mt-1">
            {createPasswordForm.formState.isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Lock className="size-4" />
            )}
            Continue
          </Button>
          <button type="button" onClick={changePhone} className="text-sm text-muted-foreground hover:underline">
            Change phone number
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={loginPasswordForm.handleSubmit(onSubmitLoginPassword)} className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">
          Enter the password for <span className="font-medium text-foreground">{phone}</span>.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...loginPasswordForm.register("password")}
          />
          {loginPasswordForm.formState.errors.password && (
            <p className="text-xs text-destructive">{loginPasswordForm.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" disabled={loginPasswordForm.formState.isSubmitting} className="mt-1">
          {loginPasswordForm.formState.isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          Continue
        </Button>
        <button type="button" onClick={changePhone} className="text-sm text-muted-foreground hover:underline">
          Change phone number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={codeForm.handleSubmit(onSubmitCode)} className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code sent to <span className="font-medium text-foreground">{phone}</span>.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Verification code</Label>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          className="tracking-[0.3em]"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          {...codeForm.register("code")}
        />
        {codeForm.formState.errors.code && (
          <p className="text-xs text-destructive">{codeForm.formState.errors.code.message}</p>
        )}
      </div>
      <Button type="submit" disabled={codeForm.formState.isSubmitting} className="mt-1">
        {codeForm.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        Verify
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={changePhone} className="text-muted-foreground hover:underline">
          Change phone number
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0}
          className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
