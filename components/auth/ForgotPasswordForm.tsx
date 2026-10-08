"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckIcon } from "@/components/system/icons";
import {
  RESEND_COOLDOWN_SECONDS,
  compactPhone,
  registerCodeField,
} from "@/components/auth/PhoneAuthForm";
import { OtpMethodButtons, type OtpChannel } from "@/components/auth/OtpChannelPicker";
import {
  AuthError,
  BackIcon,
  ClockIcon,
  CodeCells,
  FieldHelpText,
  FieldLabel,
  Hairline,
  PasswordInput,
  PhoneChip,
  PhoneInput,
  RefreshIcon,
  SlidersIcon,
  SmsSampleCard,
  STEP_SUBTITLE_CLASS,
  STEP_TITLE_CLASS,
  StepHeading,
  StepRail,
  TextAction,
} from "@/components/auth/auth-ui";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { authText, formatMyanmarPhone, validationMessage } from "@/lib/i18n/sections/auth";
import { authErrorMessage } from "@/lib/auth/auth-errors";
import { handedOffPhoneOrEmpty, handOffPhone } from "@/lib/auth/phone-handoff";
import { loginHref } from "@/lib/auth/return-to";
import { cn } from "@/lib/utils";
import {
  phoneResolver,
  resetPasswordResolver,
  type PhoneValues,
  type ResetPasswordValues,
} from "@/lib/validation/auth";

/**
 * "Forgot password?" (H-8), on the sign-in flow's own code service:
 * phone → "Get your code" (nothing is requested until the user taps a
 * method; only SMS works today) → a reset code (POST /auth/otp/request with
 * purpose "password_reset") → the code plus a new password (POST
 * /auth/password/reset). The reset opens no session and signs the account
 * out everywhere, so it ends on "sign in with your new password" — the
 * normal password-then-code sign-in, number carried over.
 *
 * Codes are only requested, never said to be "sent": SMS delivery is not
 * switched on yet (C-2).
 *
 * Marquee look (ForgotPassword board): a three-step rail (Phone · Get code ·
 * New password), the "+95 … · Change" chip, six code cells with the new
 * password under them, and a green-tick done screen.
 */
export function ForgotPasswordForm({ returnTo }: { returnTo?: string | null } = {}) {
  const { requestOtp, resetPassword } = useAuth();
  const { t } = useLanguage();
  const a = useSection(authText);

  const [step, setStep] = useState<"phone" | "method" | "code" | "done">(
    "phone",
  );
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  // The method whose first request is in flight on the "Get your code" step.
  const [sendingChannel, setSendingChannel] = useState<OtpChannel | null>(null);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const phoneForm = useForm<PhoneValues>({
    resolver: phoneResolver,
    // Arrived from the sign-in password step: the number is already known.
    defaultValues: { phone: handedOffPhoneOrEmpty() },
  });
  const resetForm = useForm<ResetPasswordValues>({
    resolver: resetPasswordResolver,
  });
  const codeValue = useWatch({ control: resetForm.control, name: "code" }) ?? "";

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

  // Requests nothing — the user picks how to get the code on the next step.
  const onSubmitPhone = (values: PhoneValues) => {
    setError(null);
    setPhone(values.phone);
    setStep("method");
  };

  /** A method tapped on the "Get your code" step (only SMS ever arrives here). */
  const onPickMethod = async (via: OtpChannel) => {
    if (sendingChannel) return;
    setError(null);
    // Back here from the code step while the resend wait still runs: the
    // code already requested is still good, and another request would only
    // be refused — so go straight back to typing it.
    if (cooldown > 0) {
      setStep("code");
      return;
    }
    setSendingChannel(via);
    try {
      // A number with no customer account (staff included), or whose account
      // is suspended, banned or closed, is refused here before any code
      // exists; so is a second request inside the 60 s wait. authErrorMessage
      // shows each refusal translated, and the page stays on this step.
      await requestOtp(phone, "password_reset");
      startCooldown();
      resetForm.reset();
      setStep("code");
    } catch (err) {
      setError(authErrorMessage(err, t));
    } finally {
      setSendingChannel(null);
    }
  };

  const chooseAnotherMethod = () => {
    if (resending) return;
    setError(null);
    setStep("method");
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

  const shownPhone = formatMyanmarPhone(phone);
  const chip = (
    <PhoneChip
      phone={phone}
      label={a.chipResetting(shownPhone)}
      onChange={changePhone}
      disabled={sendingChannel !== null || resending}
    />
  );

  let content: ReactNode;
  let stepIndex = 0;

  if (step === "done") {
    stepIndex = 3;
    content = (
      <div key="done" className="mq-rise" role="status">
        <span
          aria-hidden
          className="mt-8 flex size-16 items-center justify-center rounded-full bg-money/14"
        >
          <CheckIcon size={30} className="text-money" />
        </span>
        <StepHeading title={t.auth.reset.doneTitle} subtitle={t.auth.reset.doneBody} />
        <Link
          href={returnTo ? loginHref(returnTo) : "/login"}
          className={cn(buttonVariants({ variant: "commit", size: "block" }), "mt-8")}
        >
          {t.auth.signInLink}
        </Link>
      </div>
    );
  } else if (step === "method") {
    stepIndex = 1;
    content = (
      <div key="method" className="mq-rise">
        <h1
          id="reset-method-title"
          className={STEP_TITLE_CLASS}
        >
          {t.auth.otpMethodTitle}
        </h1>
        <p id="reset-method-subtitle" className={STEP_SUBTITLE_CLASS}>
          {t.auth.otpMethodSubtitle}
        </p>
        {chip}
        <OtpMethodButtons
          labelledBy="reset-method-title"
          describedBy="reset-method-subtitle"
          labels={t.auth.otpMethods}
          comingSoon={t.auth.otpComingSoon}
          unavailableHint={t.auth.otpMethodUnavailable}
          requestingLabel={t.auth.reset.requesting}
          sending={sendingChannel}
          disabled={sendingChannel !== null}
          onSelect={(via) => void onPickMethod(via)}
        />
        {error && <AuthError id="method-err">{error}</AuthError>}
        <span aria-live="polite" className="sr-only">
          {sendingChannel ? t.auth.reset.requesting : ""}
        </span>
        {/* Back to the phone step (the board's Back) — the same as Change. */}
        <TextAction
          tone="plain"
          className="mt-4"
          locked={sendingChannel !== null}
          icon={<BackIcon size={18} />}
          onClick={changePhone}
        >
          {t.common.back}
        </TextAction>
      </div>
    );
  } else if (step === "phone") {
    stepIndex = 0;
    const phoneError =
      validationMessage(a, phoneForm.formState.errors.phone?.message) ?? error;
    content = (
      <div key="phone" className="mq-rise">
        <StepHeading title={t.auth.reset.title} subtitle={t.auth.reset.subtitle} />
        <form
          onSubmit={(event) => phoneForm.handleSubmit(onSubmitPhone)(event)}
          className="mt-8"
        >
          <FieldLabel htmlFor="reset-phone">{t.auth.phoneLabel}</FieldLabel>
          <PhoneInput
            id="reset-phone"
            placeholder={a.phonePlaceholder}
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={phoneError ? "reset-phone-err" : "reset-phone-help"}
            {...phoneForm.register("phone", { setValueAs: compactPhone })}
          />
          {phoneError ? (
            <AuthError id="reset-phone-err">{phoneError}</AuthError>
          ) : (
            <FieldHelpText id="reset-phone-help">{a.phoneHelp}</FieldHelpText>
          )}
          <Button
            type="submit"
            variant="commit"
            size="block"
            disabled={phoneForm.formState.isSubmitting}
            className="mt-6"
          >
            {t.auth.continue}
          </Button>
        </form>
      </div>
    );
  } else {
    stepIndex = 2;
    const { errors, isSubmitting } = resetForm.formState;
    const codeError = validationMessage(a, errors.code?.message);
    const passwordError = validationMessage(a, errors.password?.message);
    const confirmError = validationMessage(a, errors.confirmPassword?.message);
    const resendLocked = cooldown > 0 || resending;
    content = (
      <div key="code" className="mq-rise">
        <StepHeading title={a.resetCodeTitle} subtitle={a.resetCodeHint(shownPhone)} />
        {chip}
        <SmsSampleCard />
        <form onSubmit={(event) => resetForm.handleSubmit(onSubmitReset)(event)}>
          <FieldLabel htmlFor="reset-code" className="mt-6">
            {a.codeLabel}
          </FieldLabel>
          <CodeCells
            id="reset-code"
            value={codeValue}
            invalid={Boolean(codeError)}
            busy={isSubmitting}
            maxLength={20}
            aria-describedby={codeError ? "reset-code-err" : "reset-code-help"}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            {...registerCodeField(
              resetForm.register("code", {
                // The SMS shows "MyanFlix: 482 913"; keep only the digits of
                // whatever is typed or pasted (even the whole message).
                setValueAs: (value: unknown) =>
                  typeof value === "string" ? value.replace(/\D/g, "") : value,
              }),
            )}
          />
          {codeError ? (
            <AuthError id="reset-code-err">{codeError}</AuthError>
          ) : (
            <FieldHelpText id="reset-code-help">{a.codeHelp}</FieldHelpText>
          )}

          <FieldLabel htmlFor="reset-password" className="mt-6">
            {t.auth.reset.newPasswordLabel}
          </FieldLabel>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            showLabel={a.showNewPassword}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "reset-password-err" : "reset-password-help"}
            {...resetForm.register("password")}
          />
          {passwordError ? (
            <AuthError id="reset-password-err">{passwordError}</AuthError>
          ) : (
            <FieldHelpText id="reset-password-help">{a.passwordHelp}</FieldHelpText>
          )}

          <FieldLabel htmlFor="reset-confirm-password" className="mt-6">
            {t.auth.confirmPasswordLabel}
          </FieldLabel>
          <PasswordInput
            id="reset-confirm-password"
            autoComplete="new-password"
            icon="shield"
            showLabel={a.showConfirmPassword}
            aria-invalid={confirmError ? true : undefined}
            aria-describedby={confirmError ? "reset-confirm-err" : undefined}
            {...resetForm.register("confirmPassword")}
          />
          {confirmError && <AuthError id="reset-confirm-err">{confirmError}</AuthError>}

          {/* The server's answer (wrong or expired code, too many tries…). */}
          {error && <AuthError id="reset-err">{error}</AuthError>}

          <Button
            type="submit"
            variant="commit"
            size="block"
            busy={isSubmitting}
            busyLabel={a.savingPassword}
            className="mt-6"
          >
            {t.auth.reset.submit}
          </Button>
        </form>

        <Hairline />
        <p className="mt-5 text-[15px] leading-[22px] font-bold text-fg">
          {t.auth.otpChannelTitle}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-7 gap-y-1">
          {/* One button through wait · requesting · ready, kept focusable while locked. */}
          <TextAction
            tone={cooldown > 0 && !resending ? "muted" : "link"}
            locked={resendLocked}
            onClick={() => void onResend()}
            icon={cooldown > 0 && !resending ? <ClockIcon size={18} /> : <RefreshIcon size={18} />}
          >
            {resending
              ? t.auth.reset.requesting
              : cooldown > 0
                ? t.auth.resendIn(cooldown)
                : t.auth.reset.requestAgain}
          </TextAction>
          {/* Back to "Get your code" — sends nothing by itself. */}
          <TextAction
            locked={resending}
            onClick={chooseAnotherMethod}
            icon={<SlidersIcon size={18} />}
          >
            {t.auth.otpChooseAnother}
          </TextAction>
        </div>
        <span aria-live="polite" className="sr-only">
          {resending ? t.auth.reset.requesting : ""}
        </span>
      </div>
    );
  }

  return (
    <div>
      <StepRail
        label={a.stepsReset}
        current={stepIndex}
        steps={[t.auth.stepPhone, t.auth.stepCode, t.auth.reset.newPasswordLabel]}
      />
      {content}
    </div>
  );
}
