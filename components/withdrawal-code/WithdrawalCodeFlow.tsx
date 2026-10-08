"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AlertCircleIcon, CheckIcon, InfoIcon } from "@/components/system";
import { Button } from "@/components/ui/button";
import {
  MoneyDialogBody,
  MoneyDialogClose,
  MoneyDialogFooter,
  MoneyDialogHeader,
  MoneyStepBars,
} from "@/components/wallet/MoneyDialog";
import {
  ArrowBackIcon,
  BigCheckIcon,
  EyeIcon,
  EyeOffIcon,
  MessageIcon,
  RetryIcon,
  ShieldLockIcon,
  TimerIcon,
} from "@/components/wallet/icons";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { walletText } from "@/lib/i18n/sections/wallet";
import { cn } from "@/lib/utils";
import {
  WITHDRAWAL_CODE_ERRORS as E,
  WITHDRAWAL_CODE_LENGTH,
  WITHDRAWAL_CODE_LOCK_MINUTES,
  cleanCodeInput,
  isResendCooldown,
  isTooEasyWithdrawalCode,
  lockEndFromIso,
  maskPhone,
  minutesUntil,
  withdrawalCodeErrorOf,
  withdrawalCodeErrorText,
} from "@/lib/withdrawal-code";
import { ApiError } from "@/services/api/apiClient";
import {
  WITHDRAWAL_CODE_STATUS_KEY,
  withdrawalCodeService,
  type WithdrawalCodeStatus,
} from "@/services/api/withdrawalCodeService";
import styles from "./CodeBoxes.module.css";

/** Where the flow runs, and what its last step does. */
export type WithdrawalCodeFlowPurpose =
  | {
      kind: "withdraw";
      /** "10,000 Ks" */
      amountLabel: string;
      /** "KBZPay — Kyaw Zin" */
      destinationLabel: string;
      /** The receiving account number, shown in the summary card. */
      accountNumber: string;
      /** The method's logo / initials disc for the summary card. */
      destinationLogo: ReactNode;
      /**
       * POST /withdrawals with this code. Resolves once the withdrawal is
       * requested (the parent moves the dialog on to its "requested"
       * screen); rejects with the server's error, which this flow sorts into
       * "about the code" (shown here) and everything else (handed to
       * `onFailed`).
       */
      submit: (code: string) => Promise<void>;
      /** Back to the withdrawal form — nothing is sent. */
      onBack: () => void;
      /** The withdrawal was refused for a reason that is not the code (amount, balance, …). */
      onFailed: (err: unknown) => void;
    }
  | {
      kind: "settings";
      onClose: () => void;
    };

/**
 * create → confirm: the first code. enter: the code for this withdrawal.
 * current → newCode → confirmNew: Change. sms → newCode → confirmNew: Forgot.
 */
type Step = "create" | "confirm" | "enter" | "current" | "newCode" | "confirmNew" | "sms" | "done";
type Feedback = { tone: "error" | "info"; text: string } | null;
type FocusTarget = "input" | "forgot";
interface CodeLock {
  until: number;
  minutes: number;
}

// A LOCKED answer whose end this computer can't place (none sent, or already past on its clock).
const LOCK_FALLBACK_MS = WITHDRAWAL_CODE_LOCK_MINUTES * 60_000;
const RESEND_FALLBACK_SECONDS = 60;

/** The server's lock on this computer's clock, never longer than 15 minutes. */
function lockFromIso(iso: string | null | undefined, now: number): CodeLock | null {
  const until = lockEndFromIso(iso, now);
  return until === null ? null : { until, minutes: minutesUntil(until, now) };
}

/**
 * Chrome, Edge and Safari can hide the digits of a plain text field
 * (-webkit-text-security). The code then never sits in a password field,
 * which their password managers would offer to save — or "update" — as the
 * MyanFlix sign-in password. Other browsers get a password field.
 */
function canMaskTextField(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function"
    ? CSS.supports("-webkit-text-security", "disc")
    : false;
}

/**
 * THE withdrawal-code steps, drawn inside an already-open money dialog (the
 * wallet's Withdraw dialog, or the Settings "Withdrawal code" dialog). The
 * flow draws the whole inside of the dialog — header, scrolling body and
 * footer — because its steps change all three.
 *
 * Marquee (Withdraw.dc.html, Settings.dc.html): a crimson shield disc, the
 * step's title and line, six code boxes over ONE real numeric input, a
 * message line, Show code / Forgot code?, and Back + the crimson primary.
 *
 * Every verdict is the server's. The client only refuses what it can see
 * for itself (too easy, the two entries differ, same as the old code), so a
 * user is not sent round-trip to learn it. The code lives in component
 * state for the length of the flow and is never stored.
 */
export function WithdrawalCodeFlow({
  purpose,
  status,
  onBusyChange,
}: {
  purpose: WithdrawalCodeFlowPurpose;
  /** Fresh from GET /users/me/withdrawal-code when the flow opened. */
  status: WithdrawalCodeStatus;
  /**
   * True while a request is on its way. The dialog holding the flow stays
   * open until the answer arrives (the house rule for money dialogs), so a
   * refused code is never answered into a closed dialog.
   */
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useLanguage();
  const tc = t.withdrawalCode;
  const w = useSection(walletText);
  const shell = useSection(shellText);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isWithdraw = purpose.kind === "withdraw";
  /** Where "Forgot code?" was opened from, and where its Back returns. */
  const codeStep: Step = isWithdraw ? "enter" : "current";

  const [step, setStep] = useState<Step>(status.hasCode ? codeStep : "create");
  const [value, setValue] = useState("");
  // The new code typed on create/newCode, waiting for its confirmation.
  const [first, setFirst] = useState("");
  // Change: the current code the server just accepted.
  const [oldCode, setOldCode] = useState("");
  // newCode/confirmNew serve both Change and Forgot.
  const [reason, setReason] = useState<"change" | "reset">("change");
  const [feedback, setFeedbackState] = useState<Feedback>(null);
  // Bumped whenever an error lands, so the boxes shake once per refusal.
  const [shakeKey, setShakeKey] = useState(0);
  const setFeedback = (next: Feedback) => {
    setFeedbackState(next);
    if (next?.tone === "error") setShakeKey((k) => k + 1);
  };
  const [lock, setLock] = useState<CodeLock | null>(() =>
    lockFromIso(status.lockedUntil, Date.now()),
  );
  const [busy, setBusyState] = useState<null | "submit" | "sms" | "resend">(null);
  const setBusy = (next: null | "submit" | "sms" | "resend") => {
    setBusyState(next);
    onBusyChange?.(next !== null);
  };
  const [sms, setSms] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [visible, setVisible] = useState(false);
  // Read once: the flow only ever renders in the browser, inside an open dialog.
  const [maskText] = useState(canMaskTextField);
  const [doneKind, setDoneKind] = useState<"created" | "changed" | "reset">("created");
  const [focusRequest, setFocusRequest] = useState<{ target: FocusTarget; n: number }>(() => ({
    target: lock && status.hasCode ? "forgot" : "input",
    n: 0,
  }));

  const inputRef = useRef<HTMLInputElement>(null);
  const forgotRef = useRef<HTMLButtonElement>(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const uid = useId();
  const fieldId = `${uid}-code`;
  const messageId = `${uid}-message`;
  const bodyId = `${uid}-body`;
  const doneTitleId = `${uid}-done-title`;
  const doneBodyId = `${uid}-done-body`;

  // Focus follows the flow: every new step lands in its field, and a lock
  // lands on "Forgot code?" (the field is off while locked).
  useEffect(() => {
    const target = focusRequest.target === "forgot" ? forgotRef.current : inputRef.current;
    target?.focus();
  }, [focusRequest]);

  // The lock reads "Try again in N minutes" — keep N honest, and lift the
  // lock the moment it runs out (the server forgets the wrong tries too).
  const lockUntil = lock?.until ?? null;
  useEffect(() => {
    if (lockUntil === null) return;
    const id = setInterval(() => {
      const now = Date.now();
      setLock(now >= lockUntil ? null : { until: lockUntil, minutes: minutesUntil(lockUntil, now) });
    }, 10_000);
    return () => clearInterval(id);
  }, [lockUntil]);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const requestFocus = (target: FocusTarget) =>
    setFocusRequest((prev) => ({ target, n: prev.n + 1 }));

  /** Move to a step with an empty field (and, optionally, something to say there). */
  const goTo = (next: Step, say: Feedback = null, focus: FocusTarget = "input") => {
    setStep(next);
    setValue("");
    setVisible(false);
    setFeedback(say);
    requestFocus(focus);
  };

  const rememberStatus = (next: WithdrawalCodeStatus) =>
    queryClient.setQueryData(WITHDRAWAL_CODE_STATUS_KEY, next);
  const forgetStatus = () =>
    queryClient.invalidateQueries({ queryKey: WITHDRAWAL_CODE_STATUS_KEY });

  const errorFeedback = (err: unknown): Feedback => ({
    tone: "error",
    text: withdrawalCodeErrorText(err, t, Date.now()),
  });

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * A refusal of the code typed on `at` (enter or current) — wrong, locked,
   * missing… Returns false when the failure is not about the code.
   */
  const showCodeRefusal = (err: unknown, at: Step): boolean => {
    const now = Date.now();
    switch (withdrawalCodeErrorOf(err)) {
      case E.WRONG:
        // Tries left changed — the Settings panel re-reads it.
        void forgetStatus();
        goTo(at, errorFeedback(err));
        return true;
      case E.REQUIRED:
      case E.INVALID_FORMAT:
        goTo(at, errorFeedback(err));
        return true;
      case E.LOCKED:
        void forgetStatus();
        setLock(
          lockFromIso((err as ApiError).lockedUntil, now) ?? {
            until: now + LOCK_FALLBACK_MS,
            minutes: minutesUntil(now + LOCK_FALLBACK_MS, now),
          },
        );
        setShakeKey((k) => k + 1);
        goTo(at, null, "forgot");
        return true;
      case E.NOT_SET:
        // The account has no code after all (the status was stale): make one.
        void forgetStatus();
        setFirst("");
        goTo("create", { tone: "info", text: tc.errors.notSet });
        return true;
      default:
        return false;
    }
  };

  /** Withdraw only: POST /withdrawals with `code`. `codeJustSaved` = create/reset just succeeded. */
  const runWithdrawal = async (code: string, codeJustSaved: boolean) => {
    if (purpose.kind !== "withdraw") return;
    try {
      await purpose.submit(code);
      // Success: the parent moves the dialog on to its "requested" screen.
    } catch (err) {
      if (showCodeRefusal(err, "enter")) return;
      if (err instanceof ApiError && (err.status === 0 || err.status === 429)) {
        // Nothing was sent; try again from the code step (the code exists now).
        if (codeJustSaved) goTo("enter", errorFeedback(err));
        else setFeedback(errorFeedback(err));
        return;
      }
      // The amount, the balance, the account details… — the form's business.
      purpose.onFailed(err);
    }
  };

  /** confirm: save the first code — and, from Withdraw, send the withdrawal with it. */
  const saveFirstCode = async () => {
    setBusy("submit");
    try {
      const next = await withdrawalCodeService.create(first, value);
      rememberStatus(next);
      if (purpose.kind === "withdraw") {
        toast.success(tc.doneCreatedTitle, { description: tc.noteCreatedBody });
        await runWithdrawal(value, true);
      } else {
        setDoneKind("created");
        setStep("done");
      }
    } catch (err) {
      switch (withdrawalCodeErrorOf(err)) {
        case E.ALREADY_SET:
          void forgetStatus();
          setFirst("");
          goTo(codeStep, { tone: "info", text: tc.errors.alreadySet });
          break;
        case E.TOO_EASY:
        case E.INVALID_FORMAT:
          setFirst("");
          goTo("create", errorFeedback(err));
          break;
        default:
          setFeedback(errorFeedback(err));
      }
    } finally {
      setBusy(null);
    }
  };

  /** current: is this the account's code? (Counts toward the lock.) */
  const verifyCurrent = async () => {
    setBusy("submit");
    try {
      const next = await withdrawalCodeService.verify(value);
      rememberStatus(next);
      setOldCode(value);
      setReason("change");
      setFirst("");
      goTo("newCode");
    } catch (err) {
      if (!showCodeRefusal(err, "current")) setFeedback(errorFeedback(err));
    } finally {
      setBusy(null);
    }
  };

  /** confirmNew after Change. */
  const saveChangedCode = async () => {
    setBusy("submit");
    try {
      const next = await withdrawalCodeService.change(oldCode, first, value);
      rememberStatus(next);
      setDoneKind("changed");
      setStep("done");
    } catch (err) {
      switch (withdrawalCodeErrorOf(err)) {
        case E.WRONG:
        case E.LOCKED:
        case E.NOT_SET:
          // The current code stopped matching meanwhile — start from it again.
          setOldCode("");
          setFirst("");
          showCodeRefusal(err, "current");
          break;
        case E.SAME:
        case E.TOO_EASY:
          setFirst("");
          goTo("newCode", errorFeedback(err));
          break;
        default:
          setFeedback(errorFeedback(err));
      }
    } finally {
      setBusy(null);
    }
  };

  /** confirmNew after Forgot code: set the new code — and, from Withdraw, send the withdrawal. */
  const saveResetCode = async () => {
    if (!resetToken) {
      goTo("sms", { tone: "error", text: tc.errors.resetExpired });
      return;
    }
    setBusy("submit");
    try {
      const next = await withdrawalCodeService.confirmReset(resetToken, first, value);
      rememberStatus(next);
      setResetToken(null);
      setLock(null);
      if (purpose.kind === "withdraw") {
        toast.success(tc.doneResetTitle, { description: tc.doneResetBody });
        await runWithdrawal(value, true);
      } else {
        setDoneKind("reset");
        setStep("done");
      }
    } catch (err) {
      switch (withdrawalCodeErrorOf(err)) {
        case E.RESET_EXPIRED:
        case E.RESET_SMS_INVALID:
        case E.RESET_SMS_TOO_MANY:
          // The SMS step's proof is gone — a new SMS code is needed.
          setResetToken(null);
          setFirst("");
          setSms("");
          goTo("sms", errorFeedback(err));
          break;
        case E.TOO_EASY:
        case E.INVALID_FORMAT:
          setFirst("");
          goTo("newCode", errorFeedback(err));
          break;
        case E.NOT_SET:
          void forgetStatus();
          setFirst("");
          goTo("create", { tone: "info", text: tc.errors.notSet });
          break;
        default:
          setFeedback(errorFeedback(err));
      }
    } finally {
      setBusy(null);
    }
  };

  /** "Forgot code?" — text a code to the account phone, then the SMS step. */
  const startForgot = async () => {
    if (busy) return;
    // Still inside the resend wait: the code already sent is still good.
    if (cooldown > 0) {
      setSms("");
      goTo("sms");
      return;
    }
    setBusy("sms");
    setFeedback(null);
    try {
      const res = await withdrawalCodeService.requestReset();
      startCooldown(res.resendAfterSeconds || RESEND_FALLBACK_SECONDS);
      setSms("");
      setResetToken(null);
      goTo("sms");
    } catch (err) {
      if (withdrawalCodeErrorOf(err) === E.NOT_SET) {
        void forgetStatus();
        setFirst("");
        goTo("create", { tone: "info", text: tc.errors.notSet });
      } else if (isResendCooldown(err)) {
        // A code was sent less than a minute ago — it still works.
        setSms("");
        goTo("sms", { tone: "info", text: tc.recentCodeSent });
      } else {
        setFeedback(errorFeedback(err));
        requestFocus(lock ? "forgot" : "input");
      }
    } finally {
      setBusy(null);
    }
  };

  const resendSms = async () => {
    if (busy || cooldown > 0) return;
    setBusy("resend");
    setFeedback(null);
    try {
      const res = await withdrawalCodeService.requestReset();
      startCooldown(res.resendAfterSeconds || RESEND_FALLBACK_SECONDS);
      setSms("");
      setFeedback({ tone: "info", text: tc.newCodeSent });
      requestFocus("input");
    } catch (err) {
      setFeedback(errorFeedback(err));
    } finally {
      setBusy(null);
    }
  };

  /** sms: check the texted code; the server answers with the token the last step needs. */
  const verifySms = async () => {
    setBusy("submit");
    try {
      const res = await withdrawalCodeService.verifyReset(sms);
      setResetToken(res.resetToken);
      setReason("reset");
      setFirst("");
      goTo("newCode");
    } catch (err) {
      switch (withdrawalCodeErrorOf(err)) {
        case E.RESET_SMS_INVALID:
        case E.RESET_SMS_TOO_MANY:
          setSms("");
          setFeedback(errorFeedback(err));
          requestFocus("input");
          break;
        case E.NOT_SET:
          void forgetStatus();
          setFirst("");
          goTo("create", { tone: "info", text: tc.errors.notSet });
          break;
        default:
          setFeedback(errorFeedback(err));
      }
    } finally {
      setBusy(null);
    }
  };

  // ── What the current step allows ───────────────────────────────────────
  const isPickStep = step === "create" || step === "newCode";
  const isConfirmStep = step === "confirm" || step === "confirmNew";
  const isCodeStep = step === "enter" || step === "current";
  const full = value.length === WITHDRAWAL_CODE_LENGTH;
  const locked = lock !== null && isCodeStep;
  const mismatch = isConfirmStep && full && value !== first;
  const liveError =
    isPickStep && full && isTooEasyWithdrawalCode(value)
      ? tc.errors.tooEasy
      : step === "newCode" && reason === "change" && full && value === oldCode
        ? tc.errors.same
        : mismatch
          ? tc.errors.mismatch
          : null;

  const canSubmit =
    busy === null &&
    (step === "sms"
      ? sms.length === WITHDRAWAL_CODE_LENGTH
      : isCodeStep
        ? full && !locked
        : full && liveError === null);

  const onPrimary = () => {
    if (!canSubmit) return;
    switch (step) {
      case "create":
        setFirst(value);
        goTo("confirm");
        return;
      case "newCode":
        setFirst(value);
        goTo("confirmNew");
        return;
      case "confirm":
        void saveFirstCode();
        return;
      case "confirmNew":
        void (reason === "change" ? saveChangedCode() : saveResetCode());
        return;
      case "enter":
        setBusy("submit");
        void runWithdrawal(value, false).finally(() => setBusy(null));
        return;
      case "current":
        void verifyCurrent();
        return;
      case "sms":
        void verifySms();
        return;
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onPrimary();
  };

  const goBack = () => {
    if (busy) return;
    switch (step) {
      case "create":
      case "enter":
      case "current":
        if (purpose.kind === "withdraw") purpose.onBack();
        else purpose.onClose();
        return;
      case "confirm":
        setFirst("");
        goTo("create");
        return;
      case "newCode":
        if (reason === "change") {
          setOldCode("");
          goTo("current");
        } else {
          // Leaving the reset: its one-time proof is dropped with it.
          setResetToken(null);
          goTo(codeStep);
        }
        return;
      case "confirmNew":
        setFirst("");
        goTo("newCode");
        return;
      case "sms":
        goTo(codeStep);
        return;
    }
  };

  const startOver = () => {
    setFirst("");
    goTo(step === "confirm" ? "create" : "newCode");
  };

  const busyHere = busy !== null;
  const inForgot = step === "sms" || (reason === "reset" && (step === "newCode" || step === "confirmNew"));

  // ── Done (Settings only) ───────────────────────────────────────────────
  if (step === "done") {
    const done =
      doneKind === "created"
        ? { title: tc.doneCreatedTitle, body: tc.doneCreatedBody }
        : doneKind === "changed"
          ? { title: tc.doneChangedTitle, body: tc.doneChangedBody }
          : { title: tc.doneResetTitle, body: tc.doneResetBody };
    return (
      <>
        <SettingsHeader
          kicker={doneKind === "reset" ? tc.forgotKicker : tc.kicker}
          rail={doneKind === "created" ? [2, 2] : [3, 3]}
        />
        <MoneyDialogBody className="items-center pt-7 text-center">
          <span
            aria-hidden
            className="mq-rise flex size-14 shrink-0 items-center justify-center rounded-full bg-money/14 text-money"
          >
            <BigCheckIcon size={28} />
          </span>
          <div className="-mt-2">
            <DialogPrimitive.Title
              id={doneTitleId}
              className="text-[24px] leading-[30px] font-extrabold tracking-[-0.02em] text-fg"
            >
              {done.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description
              id={doneBodyId}
              className="mx-auto mt-2 max-w-[340px] text-[15px] leading-[23px] text-fg-muted"
            >
              {done.body}
            </DialogPrimitive.Description>
          </div>
        </MoneyDialogBody>
        <MoneyDialogFooter>
          {/* Focus lands here, and the button reads out what just happened. */}
          <Button
            variant="commit"
            size="cta"
            className="px-7"
            onClick={purpose.kind === "settings" ? purpose.onClose : undefined}
            aria-describedby={`${doneTitleId} ${doneBodyId}`}
            autoFocus
          >
            {tc.done}
          </Button>
        </MoneyDialogFooter>
      </>
    );
  }

  // ── Copy for the step ──────────────────────────────────────────────────
  const phone = maskPhone(user?.phone);
  const sendTo =
    purpose.kind === "withdraw" ? tc.sendTo(purpose.amountLabel, purpose.destinationLabel) : "";
  const copy: { title: string; body: string; label: string; progress: [number, number] | null } =
    step === "create"
      ? { title: tc.createTitle, body: tc.createBody, label: tc.codeLabel, progress: [1, 2] }
      : step === "confirm"
        ? { title: tc.confirmTitle, body: tc.confirmBody, label: tc.confirmLabel, progress: [2, 2] }
        : step === "enter"
          ? { title: tc.enterTitle, body: sendTo, label: tc.enterLabel, progress: null }
          : step === "current"
            ? { title: tc.currentTitle, body: tc.currentBody, label: tc.currentLabel, progress: [1, 3] }
            : step === "newCode"
              ? {
                  title: tc.newTitle,
                  body: reason === "reset" ? tc.newBodyReset : tc.createBody,
                  label: tc.newLabel,
                  progress: [2, 3],
                }
              : step === "confirmNew"
                ? { title: tc.confirmTitle, body: tc.confirmBody, label: tc.confirmLabel, progress: [3, 3] }
                : {
                    title: tc.smsTitle,
                    body: phone ? tc.smsBody(phone) : tc.smsBodyNoPhone,
                    label: tc.smsLabel,
                    progress: [1, 3],
                  };
  const progress = copy.progress;

  const primaryLabel =
    step === "sms"
      ? tc.verify
      : step === "confirm" || step === "confirmNew" || step === "enter"
        ? isWithdraw
          ? w.submitWithdrawal
          : tc.saveCode
        : tc.next;
  const backLabel = !isWithdraw && (step === "create" || step === "current") ? t.common.cancel : t.common.back;

  // One line under the boxes: the server's word first, then the lock, then
  // what the client can see for itself, then a hint.
  const line: { tone: "error" | "info" | "ok" | "hint"; text: string } | null = feedback
    ? feedback
    : locked && lock
      ? { tone: "error", text: tc.errors.locked(lock.minutes) }
      : liveError
        ? { tone: "error", text: liveError }
        : isPickStep && full
          ? { tone: "ok", text: tc.looksGood }
          : isConfirmStep && full
            ? { tone: "ok", text: tc.codesMatch }
            : isPickStep
              ? { tone: "hint", text: tc.hintEasy }
              : null;
  const lineIsError = line?.tone === "error";
  const LineIcon =
    line?.tone === "error" ? AlertCircleIcon : line?.tone === "ok" ? CheckIcon : line?.tone === "info" ? InfoIcon : null;

  const secret = step !== "sms";
  const fieldValue = step === "sms" ? sms : value;

  // The Withdraw dialog's grey step line under "Withdraw funds".
  const withdrawStepLine =
    step === "create" || step === "confirm"
      ? w.withdrawStepCreate
      : inForgot
        ? w.withdrawStepReset
        : w.withdrawStepCode;

  return (
    <>
      {purpose.kind === "withdraw" ? (
        <>
          <MoneyDialogHeader title={w.withdrawFunds} subtitle={withdrawStepLine} closeDisabled={busyHere} />
          <MoneyStepBars total={2} current={2} />
        </>
      ) : (
        <SettingsHeader
          kicker={inForgot ? tc.forgotKicker : tc.kicker}
          stepLabel={progress ? tc.stepOf(progress[0], progress[1]) : undefined}
          rail={progress}
          closeDisabled={busyHere}
        />
      )}

      <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <MoneyDialogBody className={cn(!isWithdraw && "pt-7")}>
          {purpose.kind === "withdraw" && (
            <div className="flex items-center gap-3.5 rounded-[14px] bg-raised px-4 py-3.5">
              {purpose.destinationLogo}
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-4 font-bold text-fg-faint">{w.withdrawing}</p>
                <p className="mt-0.5 text-[15px] leading-[22px] font-extrabold break-words text-fg nums">
                  {w.amountTo(purpose.amountLabel, purpose.destinationLabel)}
                </p>
                <p className="text-[13px] leading-[18px] text-fg-muted nums">{purpose.accountNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!busyHere) purpose.onBack();
                }}
                disabled={busyHere}
                aria-label={w.editAmountOrAccount}
                className="mq-link h-10 shrink-0 rounded-md px-1.5 text-[15px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-40"
              >
                {w.edit}
              </button>
            </div>
          )}

          <div className="flex flex-col items-center text-center">
            <span
              aria-hidden
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full",
                isWithdraw ? "size-[52px]" : "size-14",
                locked ? "bg-danger/14 text-danger" : "bg-crimson/14 text-link",
              )}
            >
              {locked ? <TimerIcon size={26} /> : <ShieldLockIcon size={isWithdraw ? 26 : 28} />}
            </span>
            {isWithdraw ? (
              <h3 className="mt-3.5 text-[24px] leading-[30px] font-extrabold tracking-[-0.02em] text-fg">
                {copy.title}
              </h3>
            ) : (
              <DialogPrimitive.Title className="mt-4 text-[24px] leading-[30px] font-extrabold tracking-[-0.02em] text-fg">
                {copy.title}
              </DialogPrimitive.Title>
            )}
            {copy.body &&
              (isWithdraw ? (
                <p id={bodyId} className="mt-1.5 max-w-[400px] text-[15px] leading-[23px] text-fg-muted nums">
                  {copy.body}
                </p>
              ) : (
                <DialogPrimitive.Description
                  id={bodyId}
                  className="mt-2 max-w-[340px] text-[15px] leading-[23px] text-fg-muted"
                >
                  {copy.body}
                </DialogPrimitive.Description>
              ))}

            <label htmlFor={fieldId} className="sr-only">
              {copy.label}
            </label>
            <div
              className={cn(
                "group relative mt-[22px] w-full max-w-[420px] rounded-[14px] outline-offset-4",
                full && "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-link",
              )}
            >
              <div
                key={shakeKey}
                aria-hidden
                className={cn(
                  "grid grid-cols-6 gap-2.5 max-desk:gap-1.5",
                  shakeKey > 0 && lineIsError && styles.shake,
                )}
              >
                {Array.from({ length: WITHDRAWAL_CODE_LENGTH }, (_, i) => {
                  const filled = i < fieldValue.length;
                  const now = !locked && i === fieldValue.length;
                  return (
                    <span
                      key={i}
                      className={cn(
                        "flex items-center justify-center rounded-[12px] bg-raised text-[28px] leading-[34px] font-extrabold text-fg nums",
                        isWithdraw ? "h-[68px] max-desk:h-14" : "h-14",
                        now
                          ? "ring-2 ring-crimson/55 ring-inset group-focus-within:ring-crimson"
                          : lineIsError && "ring-[1.5px] ring-danger/70 ring-inset",
                        locked && "opacity-40",
                      )}
                    >
                      {filled &&
                        (secret && !visible ? (
                          <span className="size-3.5 rounded-full bg-fg" />
                        ) : (
                          fieldValue.charAt(i)
                        ))}
                      {now && (
                        <span
                          className={cn(
                            "hidden h-7 w-0.5 rounded-[1px] bg-link group-focus-within:block",
                            styles.caret,
                          )}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
              <input
                ref={inputRef}
                id={fieldId}
                // A secret, not a password: a masked text field where the
                // browser can mask one (see canMaskTextField), and the
                // "ignore" data attributes for the password-manager add-ons.
                // The field itself is invisible over the six boxes.
                type={secret && !visible && !maskText ? "password" : "text"}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={secret ? "off" : "one-time-code"}
                spellCheck={false}
                // Room for a pasted "MyanFlix: 482 913"; only the 6 digits are kept.
                maxLength={32}
                value={fieldValue}
                onChange={(event) => {
                  const next = cleanCodeInput(event.target.value);
                  if (step === "sms") setSms(next);
                  else setValue(next);
                  setFeedback(null);
                }}
                readOnly={busyHere}
                disabled={locked}
                aria-invalid={lineIsError || undefined}
                // Landing in the field on a new step reads the step's ask too.
                aria-describedby={copy.body ? `${bodyId} ${messageId}` : messageId}
                className={cn(
                  "absolute inset-0 size-full cursor-text rounded-[12px] border-0 bg-transparent p-0 text-[16px] text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed",
                  secret && !visible && maskText && "[-webkit-text-security:disc]",
                )}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
                data-form-type="other"
              />
            </div>

            <div id={messageId} aria-live="polite" className="mt-3.5 min-h-5">
              {line && (
                <p
                  className={cn(
                    "flex items-start justify-center gap-2 text-[14px] leading-5 font-semibold nums",
                    line.tone === "error" && "text-danger",
                    line.tone === "ok" && "text-money",
                    line.tone === "info" && "text-info",
                    line.tone === "hint" && "font-normal text-fg-faint",
                  )}
                >
                  {LineIcon && <LineIcon size={18} className="mt-px shrink-0" />}
                  <span>{line.text}</span>
                </p>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
              {secret && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  disabled={locked}
                  aria-pressed={visible}
                  aria-controls={fieldId}
                  className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[14px] font-bold text-fg-muted outline-none transition-colors hover:bg-tonal-faint hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-40"
                >
                  {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  {visible ? tc.hideCode : tc.showCode}
                </button>
              )}
              {isCodeStep && (
                <button
                  ref={forgotRef}
                  type="button"
                  onClick={() => void startForgot()}
                  disabled={busyHere}
                  className="mq-link inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-[15px] font-extrabold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === "sms" && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
                  {tc.forgotCode}
                </button>
              )}
              {mismatch && (
                <button
                  type="button"
                  onClick={startOver}
                  disabled={busyHere}
                  className="mq-link inline-flex h-10 items-center gap-2 rounded-md px-3 text-[15px] font-extrabold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-60"
                >
                  <RetryIcon size={18} />
                  {tc.startOver}
                </button>
              )}
              {step === "sms" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="toolbar"
                  onClick={() => void resendSms()}
                  disabled={cooldown > 0 || busyHere}
                  focusableWhenDisabled
                  className="font-bold text-fg-muted nums hover:text-fg aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
                >
                  {busy === "resend" ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <MessageIcon size={18} />
                  )}
                  {busy === "resend" ? tc.sending : cooldown > 0 ? tc.sendNewCodeIn(cooldown) : tc.sendNewCode}
                </Button>
              )}
            </div>
          </div>
        </MoneyDialogBody>

        <MoneyDialogFooter>
          <Button type="button" variant="tonal" size="cta" className="px-5" onClick={goBack} disabled={busyHere}>
            {backLabel === t.common.back && <ArrowBackIcon size={18} />}
            {backLabel}
          </Button>
          <Button
            type="submit"
            variant="commit"
            size="cta"
            disabled={!canSubmit}
            busy={busy === "submit"}
            busyLabel={isWithdraw ? w.sendingRequest : shell.working}
            className="min-w-[168px] nums"
          >
            {primaryLabel}
          </Button>
        </MoneyDialogFooter>
      </form>
    </>
  );
}

/**
 * Settings › Withdrawal code header: the kicker ("Withdrawal code" /
 * "Forgot code"), "Step N of M", the close button, then the crimson rail.
 */
function SettingsHeader({
  kicker,
  stepLabel,
  rail,
  closeDisabled,
}: {
  kicker: string;
  stepLabel?: string;
  rail: [number, number] | null;
  closeDisabled?: boolean;
}) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-4 pt-5 pr-5 pb-3 pl-6 max-desk:pt-3 max-desk:pr-3 max-desk:pl-4">
        <p className="text-kicker">{kicker}</p>
        <div className="flex items-center gap-3">
          {stepLabel && <span className="text-[13px] leading-[18px] font-bold text-fg-muted nums">{stepLabel}</span>}
          <MoneyDialogClose disabled={closeDisabled} />
        </div>
      </div>
      {rail && <MoneyStepBars total={rail[1]} current={rail[0]} className="pt-0" />}
    </>
  );
}
