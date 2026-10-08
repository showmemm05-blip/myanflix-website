"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { Bug, CreditCard, Ellipsis, Film, Lightbulb } from "lucide-react";
import { toast } from "sonner";

import { FieldError, Modal } from "@/components/system";
import { AlertCircleIcon } from "@/components/system/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { libraryText } from "@/lib/i18n/sections/library";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/api/apiClient";
import { feedbackService } from "@/services/api/feedbackService";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  type FeedbackCategory,
} from "@/types/feedback";

const CATEGORY_ICON: Record<FeedbackCategory, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  BUG: Bug,
  SUGGESTION: Lightbulb,
  CONTENT: Film,
  PAYMENT: CreditCard,
  OTHER: Ellipsis,
};

/**
 * ONE feedback dialog for the whole app — the account menu, the footer and
 * Settings › Help & privacy all open this (the shell mounts it once), so what
 * a user sees is the same wherever they found the way in.
 *
 * Marquee dialog frame (every board's "Send feedback"): the five topics as
 * big tappable tiles (a real radio group — arrow keys move between them),
 * the message box with "At least 5 characters…" and a live count, Cancel and
 * Send. Validation is mirrored from the backend (a trimmed 5..2000 message
 * and a category from its enum) and shown inline before anything is sent.
 * The two failures the server can still return are treated differently on
 * purpose: a 429 is a state the user can wait out and gets said plainly,
 * while anything else is a retry.
 *
 * Signed-out visitors reach this from the footer, so it opens as a sign-in
 * prompt rather than a composer that would be rejected on submit.
 */
export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const lib = useSection(libraryText);
  const { isAuthenticated } = useAuth();

  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedLength = message.trim().length;

  const reset = () => {
    setCategory(null);
    setMessage("");
    setFieldError(null);
    setSubmitError(null);
  };

  const handleOpenChange = (next: boolean) => {
    // A dismissed dialog is a discarded draft — reopening it should never
    // resume someone else's half-written report, or a stale error.
    if (!next) reset();
    onOpenChange(next);
  };

  const validate = (): boolean => {
    if (trimmedLength < FEEDBACK_MESSAGE_MIN) {
      setFieldError(t.feedback.tooShort(FEEDBACK_MESSAGE_MIN));
      return false;
    }
    if (trimmedLength > FEEDBACK_MESSAGE_MAX) {
      setFieldError(t.feedback.tooLong(FEEDBACK_MESSAGE_MAX));
      return false;
    }
    setFieldError(null);
    return true;
  };

  const submit = async () => {
    setSubmitError(null);
    if (!category || !validate()) return;

    setIsSubmitting(true);
    try {
      await feedbackService.submit({ category, message: message.trim() });
      toast.success(t.feedback.success);
      reset();
      onOpenChange(false);
    } catch (error) {
      // 429 is the one outcome that isn't a failure to retry, and it gets the
      // translated sentence rather than the backend's — it is the message the
      // user is most likely to actually read. Other 4xx text is passed through
      // because it names the problem; a 5xx or a dropped connection is not,
      // since "Internal server error" tells the reader nothing.
      if (error instanceof ApiError && error.status === 429) {
        setSubmitError(t.feedback.rateLimited);
      } else if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.message) {
        setSubmitError(error.message);
      } else {
        setSubmitError(t.feedback.failed);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={t.feedback.title}
        subtitle={t.feedback.signedOutBody}
        size="sm"
        footer={
          <>
            <Button variant="tonal" size="cta" onClick={() => handleOpenChange(false)}>
              {t.common.close}
            </Button>
            <Link
              href="/login"
              onClick={() => handleOpenChange(false)}
              className={buttonVariants({ variant: "commit", size: "cta" })}
            >
              {t.comments.signIn}
            </Link>
          </>
        }
      >
        <p className="rounded-[12px] bg-raised px-4 py-3.5 text-[15px] leading-[22px] text-fg-body">
          {t.feedback.signedOutTitle}
        </p>
      </Modal>
    );
  }

  const count = message.length.toLocaleString("en-US");
  const max = FEEDBACK_MESSAGE_MAX.toLocaleString("en-US");

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t.feedback.title}
      subtitle={t.feedback.description}
      dismissible={!isSubmitting}
      footer={
        <>
          <Button variant="tonal" size="cta" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t.common.cancel}
          </Button>
          <Button
            variant="commit"
            size="cta"
            disabled={!category || trimmedLength < FEEDBACK_MESSAGE_MIN}
            busy={isSubmitting}
            busyLabel={t.feedback.submitting}
            onClick={submit}
          >
            {t.feedback.submit}
          </Button>
        </>
      }
    >
      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={isSubmitting}>
        <legend className="p-0 text-[13px] leading-[18px] font-bold text-fg-muted">{t.feedback.categoryLabel}</legend>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          {FEEDBACK_CATEGORIES.map((value) => {
            const Icon = CATEGORY_ICON[value];
            const checked = category === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 transition-colors duration-150",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link",
                  value === "OTHER" && "col-span-2",
                  checked
                    ? "bg-crimson/14 text-fg shadow-[inset_0_0_0_2px_var(--mq-crimson)]"
                    : "bg-raised text-fg-body hover:bg-raised-hover",
                )}
              >
                <input
                  type="radio"
                  name="feedback-category"
                  value={value}
                  checked={checked}
                  onChange={() => setCategory(value)}
                  className="sr-only"
                />
                <Icon className="size-[22px] shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 text-sm leading-[19px] font-bold">{t.feedback.categories[value]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="feedback-message" className="block text-[13px] leading-[18px] font-bold text-fg-muted">
          {t.feedback.messageLabel}
        </label>
        <Textarea
          id="feedback-message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (fieldError) setFieldError(null);
          }}
          onBlur={() => {
            // Only nags about a message someone has actually started — an
            // untouched empty box is not yet a mistake.
            if (message.length > 0) validate();
          }}
          placeholder={t.feedback.messagePlaceholder}
          rows={5}
          maxLength={FEEDBACK_MESSAGE_MAX}
          disabled={isSubmitting}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "feedback-message-error feedback-message-help" : "feedback-message-help"}
          className="mt-2 min-h-[140px] resize-y"
        />
        {fieldError && <FieldError id="feedback-message-error">{fieldError}</FieldError>}
        <div
          id="feedback-message-help"
          className="mt-2 flex justify-between gap-3 text-[13px] leading-[18px] text-fg-faint"
        >
          <span>{lib.feedbackHelp(FEEDBACK_MESSAGE_MIN)}</span>
          <span className="shrink-0 tabular-nums">{lib.charCount(count, max)}</span>
        </div>
      </div>

      {submitError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[12px] bg-danger/10 px-3.5 py-3 text-sm leading-[21px] text-danger"
        >
          <AlertCircleIcon size={18} className="mt-px shrink-0" />
          <span>{submitError}</span>
        </p>
      )}
    </Modal>
  );
}
