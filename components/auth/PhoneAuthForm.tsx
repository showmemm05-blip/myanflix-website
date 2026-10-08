"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { OtpMethodButtons, type OtpChannel } from "@/components/auth/OtpChannelPicker";
import {
  AuthError,
  BackIcon,
  ClockIcon,
  CodeCells,
  DoneNote,
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
  StepFootnote,
  StepHeading,
  StepRail,
  TextAction,
} from "@/components/auth/auth-ui";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import {
  authText,
  formatMyanmarPhone,
  normalizeTypedPhone,
  validationMessage,
} from "@/lib/i18n/sections/auth";
import { authErrorMessage, isStepTokenRefusal } from "@/lib/auth/auth-errors";
import { handedOffPhoneOrEmpty, handOffPhone } from "@/lib/auth/phone-handoff";
import { ApiError } from "@/services/api/apiClient";
import {
  phoneResolver,
  otpCodeResolver,
  loginPasswordResolver,
  createPasswordResolver,
  type PhoneValues,
  type OtpCodeValues,
  type LoginPasswordValues,
  type CreatePasswordValues,
} from "@/lib/validation/auth";

export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * What the phone box hands to the form check and the server: spaces and
 * dashes dropped, and a number typed after the fixed "+95" without its 0
 * given the 0 back, so the server never mistakes "95…" for the country code
 * (see normalizeTypedPhone).
 */
export const compactPhone = (value: unknown) =>
  typeof value === "string" ? normalizeTypedPhone(value) : value;

/**
 * The code field keeps only the digits of whatever is typed or pasted (the
 * SMS reads "MyanFlix: 482 913" — pasting the whole text works), at most six.
 * Rewrites the input itself too, so the six cells and the field never disagree.
 */
export function registerCodeField(registration: UseFormRegisterReturn) {
  return {
    ...registration,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
      if (event.target.value !== digits) event.target.value = digits;
      return registration.onChange(event);
    },
  };
}

/**
 * The one and only sign-in surface — login and signup share this same
 * four-step flow, branching only at the password step: an existing phone
 * enters its password, a new phone creates one. Then "Get your code": no
 * code is ever requested until the user taps a method there (only SMS
 * works today). Either way the OTP step at the end is what actually creates
 * the session — login and signup are the
 * same backend call (verifying the code either logs into the existing
 * account or creates one), so /login and /register both just render this.
 *
 * `returnTo` is where a successful sign-in lands — the page a guest was
 * bounced off (already validated as a same-origin path by the caller), or
 * the home screen when there is none. `mode` only changes the first step's
 * words (Login board: "Welcome back"; Register board: "Create your account").
 *
 * Marquee look (Login / Register / LoginCode boards): the crimson step rail,
 * one h1 per step, the "+95 … · Change" chip, errors under the field they
 * belong to, six code cells and the quiet resend row.
 */
export function PhoneAuthForm({
  returnTo,
  mode = "signIn",
}: { returnTo?: string | null; mode?: "signIn" | "signUp" } = {}) {
  const {
    checkPhoneExists,
    verifyPassword,
    requestOtp,
    verifyOtp,
    loginWithGoogle,
  } = useAuth();
  const { t } = useLanguage();
  const a = useSection(authText);
  const router = useRouter();

  const [step, setStep] = useState<"phone" | "password" | "method" | "code">(
    "phone",
  );
  const [phone, setPhone] = useState("");
  const [isNewAccount, setIsNewAccount] = useState(false);
  // Only meaningful for a new account — carried forward to the final OTP
  // verify call, since that's the moment the account actually gets created.
  const [pendingPassword, setPendingPassword] = useState("");
  // Only meaningful for an existing account (H-6): the proof, handed out by
  // the password step, that the code step must send — the server refuses
  // the code without it. Memory only, never stored; valid 10 minutes.
  const stepTokenRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Where the board shows the error: under the Google button for a Google
  // failure, otherwise under the current step's field.
  const [errorFromGoogle, setErrorFromGoogle] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // The method whose code request is in flight (only SMS can be today).
  // Nothing about the method is put on the wire — the API rejects fields it
  // doesn't know — so the request is exactly the one it always was.
  const [sendingChannel, setSendingChannel] = useState<OtpChannel | null>(null);
  // What the screen reader hears after a confirmed send — the visible
  // identity row changes too, but it is not a live region.
  const [announce, setAnnounce] = useState("");
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // "Continue with Google" lives on the phone step only. The ref makes a
  // second Google callback a no-op even before React has re-rendered with
  // the busy state — the state is what the UI reads, the ref is what the
  // guard reads.
  const [googleBusy, setGoogleBusy] = useState(false);
  // Google's account picker is open — the phone form waits (see GoogleSignIn).
  const [googlePopupOpen, setGooglePopupOpen] = useState(false);
  const googleInFlight = useRef(false);

  const phoneForm = useForm<PhoneValues>({
    resolver: phoneResolver,
    // Back from "Forgot password?": the number is already known.
    defaultValues: { phone: handedOffPhoneOrEmpty() },
  });
  const loginPasswordForm = useForm<LoginPasswordValues>({
    resolver: loginPasswordResolver,
  });
  const createPasswordForm = useForm<CreatePasswordValues>({
    resolver: createPasswordResolver,
  });
  const codeForm = useForm<OtpCodeValues>({
    resolver: otpCodeResolver,
  });
  const codeValue = useWatch({ control: codeForm.control, name: "code" }) ?? "";

  /** Every error but Google's shows under the current step's field. */
  const showError = (message: string, fromGoogle = false) => {
    setError(message);
    setErrorFromGoogle(fromGoogle);
  };
  const clearError = () => {
    setError(null);
    setErrorFromGoogle(false);
  };

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
    clearError();
    try {
      const exists = await checkPhoneExists(values.phone);
      setPhone(values.phone);
      setIsNewAccount(!exists);
      setStep("password");
    } catch (err) {
      showError(authErrorMessage(err, t));
    }
  };

  const sendCode = async (via: OtpChannel = "sms") => {
    setSendingChannel(via);
    try {
      await requestOtp(phone);
      setAnnounce(t.auth.otpRequested(formatMyanmarPhone(phone)));
      setStep("code");
      startCooldown();
      codeForm.reset();
    } catch (err) {
      showError(authErrorMessage(err, t));
    } finally {
      setSendingChannel(null);
    }
  };

  /**
   * Never sends anything: the user picks how to get the code first. The one
   * exception is a code already requested whose resend cooldown is still
   * running (sent back here when the step token ran out, or via "Back"): it
   * is still good, and asking for another inside the wait would only be
   * refused — so go straight back to typing it.
   */
  const afterPasswordStep = () => {
    setStep(cooldown > 0 ? "code" : "method");
  };

  const onSubmitLoginPassword = async (values: LoginPasswordValues) => {
    clearError();
    try {
      stepTokenRef.current = await verifyPassword(phone, values.password);
      afterPasswordStep();
    } catch (err) {
      showError(authErrorMessage(err, t));
    }
  };

  const onSubmitCreatePassword = (values: CreatePasswordValues) => {
    clearError();
    setPendingPassword(values.password);
    afterPasswordStep();
  };

  /** A method tapped on the "Get your code" step (only SMS ever arrives here). */
  const onPickMethod = (via: OtpChannel) => {
    if (sendingChannel) return;
    clearError();
    // Same rule as afterPasswordStep: the code already requested is still
    // good while the cooldown runs.
    if (cooldown > 0) {
      setStep("code");
      return;
    }
    void sendCode(via);
  };

  const onConfirmSend = () => {
    if (cooldown > 0 || sendingChannel) return;
    clearError();
    void sendCode("sms");
  };

  const chooseAnotherMethod = () => {
    if (sendingChannel) return;
    clearError();
    setStep("method");
  };

  const onSubmitCode = async (values: OtpCodeValues) => {
    clearError();
    try {
      await verifyOtp(
        phone,
        values.code,
        isNewAccount
          ? { password: pendingPassword }
          : { stepToken: stepTokenRef.current ?? undefined },
      );
      router.push(returnTo ?? "/");
    } catch (err) {
      if (!isNewAccount && isStepTokenRefusal(err)) {
        // H-6: the proof of the password step expired (10 minutes) or no
        // longer matches (the password changed meanwhile). The server
        // checked it before the code, so the code was not spent — redo the
        // password and come back.
        stepTokenRef.current = null;
        loginPasswordForm.reset();
        setStep("password");
        showError(t.auth.passwordAgain);
        return;
      }
      showError(authErrorMessage(err, t));
    }
  };

  const onGoogleCode = async (code: string) => {
    // Both directions of the busy guard: a Google code that arrives while
    // the phone check is still in flight is ignored, so two sign-in requests
    // can never race — the button's native disabled covers the click, this
    // covers a popup that was already open when the phone check started.
    if (googleInFlight.current || phoneForm.formState.isSubmitting) return;
    googleInFlight.current = true;
    setGoogleBusy(true);
    clearError();
    try {
      await loginWithGoogle({ code });
      // Deliberately still busy — we are navigating away, exactly like the
      // code step after a successful verify.
      router.push(returnTo ?? "/");
    } catch (err) {
      showError(
        err instanceof ApiError
          ? err.status === 503
            ? t.auth.googleNotConfigured
            : err.message
          : t.auth.googleFailed,
        true,
      );
      googleInFlight.current = false;
      setGoogleBusy(false);
    }
  };

  const onGoogleError = () => {
    if (googleInFlight.current) return;
    showError(t.auth.googleFailed, true);
  };

  const changePhone = () => {
    setStep("phone");
    clearError();
    setCooldown(0);
    setPendingPassword("");
    stepTokenRef.current = null;
    setAnnounce("");
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    loginPasswordForm.reset();
    createPasswordForm.reset();
    codeForm.reset();
  };

  const shownPhone = formatMyanmarPhone(phone);
  const chipLabel = isNewAccount ? a.chipCreating(shownPhone) : a.chipSigningIn(shownPhone);
  const chip = (
    <PhoneChip
      phone={phone}
      label={chipLabel}
      onChange={changePhone}
      disabled={sendingChannel !== null}
    />
  );
  /** A server error shown under the current step's field (Google's has its own place). */
  const fieldServerError = error && !errorFromGoogle ? error : null;

  let content: ReactNode;

  if (step === "phone") {
    // One sign-in at a time: a Google exchange locks the phone field and its
    // Continue; a phone check dims the Google button (see GoogleSignIn).
    const busy =
      googleBusy || googlePopupOpen || phoneForm.formState.isSubmitting;
    const phoneError =
      validationMessage(a, phoneForm.formState.errors.phone?.message) ?? fieldServerError;
    content = (
      <div key="phone" className="mq-rise">
        <StepHeading
          title={mode === "signUp" ? t.auth.registerTitle : t.auth.signInTitle}
          subtitle={mode === "signUp" ? t.auth.registerSubtitle : t.auth.signInSubtitle}
        />
        <form onSubmit={phoneForm.handleSubmit(onSubmitPhone)} className="mt-8">
          <FieldLabel htmlFor="phone">{t.auth.phoneLabel}</FieldLabel>
          <PhoneInput
            id="phone"
            placeholder={a.phonePlaceholder}
            disabled={googleBusy || googlePopupOpen}
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={phoneError ? "phone-err" : "phone-help"}
            {...phoneForm.register("phone", { setValueAs: compactPhone })}
          />
          {phoneError ? (
            <AuthError id="phone-err">{phoneError}</AuthError>
          ) : (
            <FieldHelpText id="phone-help">{a.phoneHelp}</FieldHelpText>
          )}
          <Button
            type="submit"
            variant="commit"
            size="block"
            disabled={busy}
            busy={phoneForm.formState.isSubmitting}
            busyLabel={a.checkingNumber}
            className="mt-6"
          >
            {t.auth.continue}
          </Button>
        </form>
        <GoogleSignIn
          disabled={phoneForm.formState.isSubmitting}
          busy={googleBusy}
          onCode={onGoogleCode}
          onError={onGoogleError}
          onPopupChange={setGooglePopupOpen}
        />
        {error && errorFromGoogle && <AuthError id="google-err">{error}</AuthError>}
        <StepFootnote>{mode === "signUp" ? a.signUpFootnote : a.signInFootnote}</StepFootnote>
      </div>
    );
  } else if (step === "password" && isNewAccount) {
    const { errors, isSubmitting } = createPasswordForm.formState;
    const passwordError = validationMessage(a, errors.password?.message);
    const confirmError =
      validationMessage(a, errors.confirmPassword?.message) ?? fieldServerError;
    content = (
      <div key="create" className="mq-rise">
        <StepHeading title={t.auth.registerTitle} subtitle={a.createSubtitle} />
        {chip}
        <form
          onSubmit={(event) =>
            createPasswordForm.handleSubmit(onSubmitCreatePassword)(event)
          }
        >
          <FieldLabel htmlFor="password" className="mt-6">
            {t.auth.newPasswordLabel}
          </FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            showLabel={a.showNewPassword}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "password-err" : "password-help"}
            {...createPasswordForm.register("password")}
          />
          {passwordError ? (
            <AuthError id="password-err">{passwordError}</AuthError>
          ) : (
            <FieldHelpText id="password-help">{a.passwordHelp}</FieldHelpText>
          )}
          <FieldLabel htmlFor="confirmPassword" className="mt-6">
            {t.auth.confirmPasswordLabel}
          </FieldLabel>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            icon="shield"
            showLabel={a.showConfirmPassword}
            aria-invalid={confirmError ? true : undefined}
            aria-describedby={confirmError ? "confirm-err" : undefined}
            {...createPasswordForm.register("confirmPassword")}
          />
          {confirmError && <AuthError id="confirm-err">{confirmError}</AuthError>}
          <Button
            type="submit"
            variant="commit"
            size="block"
            busy={isSubmitting}
            busyLabel={t.auth.continue}
            className="mt-6"
          >
            {t.auth.continue}
          </Button>
        </form>
        <StepFootnote>{a.createFootnote}</StepFootnote>
      </div>
    );
  } else if (step === "password") {
    const { errors, isSubmitting } = loginPasswordForm.formState;
    const passwordError =
      validationMessage(a, errors.password?.message) ?? fieldServerError;
    content = (
      <div key="password" className="mq-rise">
        <StepHeading title={t.auth.signInTitle} subtitle={a.passwordSubtitle} />
        {chip}
        <form
          onSubmit={(event) =>
            loginPasswordForm.handleSubmit(onSubmitLoginPassword)(event)
          }
        >
          <div className="mt-6 flex items-end justify-between gap-3">
            <FieldLabel htmlFor="password">{t.auth.passwordLabel}</FieldLabel>
            {/* H-8: the way out for a forgotten password — the same code
                service as sign-in, on its own page, number carried over. */}
            <Link
              href={
                returnTo
                  ? `/forgot-password?next=${encodeURIComponent(returnTo)}`
                  : "/forgot-password"
              }
              onClick={() => handOffPhone(phone)}
              className="mq-link shrink-0 rounded-[4px] text-sm leading-[18px] font-extrabold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
            >
              {t.auth.forgotPassword}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder={t.auth.passwordPlaceholder}
            showLabel={a.showPassword}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "password-err" : undefined}
            {...loginPasswordForm.register("password")}
          />
          {passwordError && <AuthError id="password-err">{passwordError}</AuthError>}
          <Button
            type="submit"
            variant="commit"
            size="block"
            busy={isSubmitting}
            busyLabel={a.checkingPassword}
            className="mt-6"
          >
            {t.auth.continue}
          </Button>
        </form>
        <StepFootnote>{a.passwordFootnote}</StepFootnote>
      </div>
    );
  } else if (step === "method") {
    content = (
      <div key="method" className="mq-rise">
        <h1
          id="otp-method-title"
          className={STEP_TITLE_CLASS}
        >
          {t.auth.otpMethodTitle}
        </h1>
        <p id="otp-method-subtitle" className={STEP_SUBTITLE_CLASS}>
          {t.auth.otpMethodSubtitle}
        </p>
        {chip}
        <DoneNote>{isNewAccount ? a.passwordChosen : a.passwordAccepted}</DoneNote>
        <OtpMethodButtons
          labelledBy="otp-method-title"
          describedBy="otp-method-subtitle"
          labels={t.auth.otpMethods}
          comingSoon={t.auth.otpComingSoon}
          unavailableHint={t.auth.otpMethodUnavailable}
          requestingLabel={t.auth.otpRequesting}
          sending={sendingChannel}
          disabled={sendingChannel !== null}
          onSelect={onPickMethod}
        />
        {fieldServerError && <AuthError id="method-err">{fieldServerError}</AuthError>}
        <span aria-live="polite" className="sr-only">
          {sendingChannel ? t.auth.otpRequesting : ""}
        </span>
        <TextAction
          tone="plain"
          className="mt-4"
          locked={sendingChannel !== null}
          icon={<BackIcon size={18} />}
          onClick={() => {
            clearError();
            setStep("password");
          }}
        >
          {t.common.back}
        </TextAction>
      </div>
    );
  } else {
    const { errors, isSubmitting } = codeForm.formState;
    const codeError = validationMessage(a, errors.code?.message) ?? fieldServerError;
    const resendLocked = cooldown > 0 || sendingChannel !== null;
    content = (
      <div key="code" className="mq-rise">
        <StepHeading title={a.codeTitle} subtitle={t.auth.otpRequested(shownPhone)} />
        {chip}
        <DoneNote>{isNewAccount ? a.passwordChosen : a.passwordAccepted}</DoneNote>
        <SmsSampleCard />
        <form onSubmit={(event) => codeForm.handleSubmit(onSubmitCode)(event)}>
          <FieldLabel htmlFor="code" className="mt-6">
            {a.codeLabel}
          </FieldLabel>
          <CodeCells
            id="code"
            value={codeValue}
            invalid={Boolean(codeError)}
            busy={isSubmitting}
            maxLength={20}
            aria-describedby={codeError ? "code-err" : "code-help"}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            {...registerCodeField(
              codeForm.register("code", {
                // The SMS shows "MyanFlix: 482 913"; keep only the digits of
                // whatever is typed or pasted (even the whole message).
                setValueAs: (value: unknown) =>
                  typeof value === "string" ? value.replace(/\D/g, "") : value,
              }),
            )}
          />
          {codeError ? (
            <AuthError id="code-err">{codeError}</AuthError>
          ) : (
            <FieldHelpText id="code-help">{a.codeHelp}</FieldHelpText>
          )}
          <Button
            type="submit"
            variant="commit"
            size="block"
            busy={isSubmitting}
            busyLabel={a.verifying}
            className="mt-6"
          >
            {isNewAccount ? t.auth.verifyAndCreate : t.auth.verifyAndSignIn}
          </Button>
        </form>
        <Hairline />
        <p className="mt-5 text-[15px] leading-[22px] font-bold text-fg">
          {t.auth.otpChannelTitle}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-7 gap-y-1">
          {/* ONE button through all three states (wait · requesting · ready),
              kept focusable while locked, so keyboard focus never drops to
              the page when the countdown starts or ends. The countdown
              ticks every second, so it is deliberately NOT a live region —
              the sr-only span below announces the state changes. */}
          <TextAction
            tone={cooldown > 0 && !sendingChannel ? "muted" : "link"}
            locked={resendLocked}
            onClick={onConfirmSend}
            icon={
              cooldown > 0 && !sendingChannel ? (
                <ClockIcon size={18} />
              ) : (
                <RefreshIcon size={18} />
              )
            }
          >
            {sendingChannel
              ? t.auth.otpRequesting
              : cooldown > 0
                ? t.auth.resendIn(cooldown)
                : t.auth.otpRequestAgain}
          </TextAction>
          {/* Back to "Get your code" — sends nothing by itself. */}
          <TextAction
            locked={sendingChannel !== null}
            onClick={chooseAnotherMethod}
            icon={<SlidersIcon size={18} />}
          >
            {t.auth.otpChooseAnother}
          </TextAction>
        </div>
        <span aria-live="polite" className="sr-only">
          {sendingChannel ? t.auth.otpRequesting : announce}
        </span>
      </div>
    );
  }

  const stepIndex =
    step === "phone" ? 0 : step === "password" ? 1 : step === "method" ? 2 : 3;
  const signingUp = step === "phone" ? mode === "signUp" : isNewAccount;

  return (
    <div>
      <StepRail
        label={signingUp ? a.stepsSignUp : a.stepsSignIn}
        current={stepIndex}
        steps={[
          t.auth.stepPhone,
          t.auth.stepPassword,
          t.auth.stepCode,
          t.auth.stepVerify,
        ]}
      />
      {content}
    </div>
  );
}
