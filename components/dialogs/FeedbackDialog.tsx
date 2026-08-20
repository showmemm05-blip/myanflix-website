"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, MessageSquarePlus, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Surface } from "@/components/system";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { ApiError } from "@/services/api/apiClient";
import { feedbackService } from "@/services/api/feedbackService";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  type FeedbackCategory,
} from "@/types/feedback";

// The dialog idioms this app already uses everywhere else.
const dialogContentClass = "gap-5 rounded-3xl p-5 ring-white/10 sm:max-w-md sm:p-6";
const dialogFooterClass = "mx-0 mb-0 border-0 bg-transparent p-0 pt-1";

/** How close to the ceiling the draft gets before the count appears. */
const COUNTER_VISIBLE_FROM = 200;

/**
 * ONE feedback dialog for the whole app — the account menu and the footer both
 * open this, so what a user sees is the same wherever they found the way in.
 *
 * Validation is mirrored from the backend (a trimmed 5..2000 message and a
 * category from its enum) and shown inline before anything is sent, so the
 * round trip is spent on real submissions. The two failures the server can
 * still return are treated differently on purpose: a 429 is a state the user
 * can wait out and gets said plainly, while anything else is a retry.
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
  const { isAuthenticated } = useAuth();

  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedLength = message.trim().length;
  const remaining = FEEDBACK_MESSAGE_MAX - message.length;

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
      } else if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.message
      ) {
        setSubmitError(error.message);
      } else {
        setSubmitError(t.feedback.failed);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={dialogContentClass}>
        <DialogHeader>
          <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25 ring-inset">
            <MessageSquarePlus className="size-5" />
          </span>
          <DialogTitle className="text-section-title">{t.feedback.title}</DialogTitle>
          <DialogDescription>
            {isAuthenticated ? t.feedback.description : t.feedback.signedOutBody}
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <>
            <Surface tone="subtle" className="px-4 py-3.5">
              <p className="text-sm text-muted-foreground">{t.feedback.signedOutTitle}</p>
            </Surface>
            <DialogFooter className={dialogFooterClass}>
              <DialogClose render={<Button variant="ghost" className="h-11 rounded-full px-5" />}>
                {t.common.close}
              </DialogClose>
              <Button
                className="h-11 rounded-full px-5"
                render={<Link href="/login" />}
                nativeButton={false}
                onClick={() => handleOpenChange(false)}
              >
                {t.comments.signIn}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="feedback-category">{t.feedback.categoryLabel}</Label>
              <Select
                id="feedback-category"
                items={FEEDBACK_CATEGORIES.map((value) => ({
                  value,
                  label: t.feedback.categories[value],
                }))}
                value={category}
                onValueChange={(value) => setCategory((value ?? null) as FeedbackCategory | null)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue placeholder={t.feedback.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t.feedback.categories[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="feedback-message">{t.feedback.messageLabel}</Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                onBlur={() => {
                  // Only nags about a message someone has actually started —
                  // an untouched empty box is not yet a mistake.
                  if (message.length > 0) validate();
                }}
                placeholder={t.feedback.messagePlaceholder}
                rows={5}
                maxLength={FEEDBACK_MESSAGE_MAX}
                disabled={isSubmitting}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? "feedback-message-error" : undefined}
                className="resize-none rounded-2xl border-white/10 bg-white/[0.04] dark:bg-white/[0.04]"
              />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p id="feedback-message-error" className="text-xs text-destructive">
                  {fieldError}
                </p>
                <span className="text-[11px] text-muted-foreground nums">
                  {remaining <= COUNTER_VISIBLE_FROM ? t.feedback.charactersLeft(remaining) : ""}
                </span>
              </div>
            </div>

            {submitError && (
              <Surface
                tone="subtle"
                className="flex items-start gap-2.5 bg-destructive/6 px-4 py-3 ring-destructive/25"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-xs text-destructive">{submitError}</p>
              </Surface>
            )}

            <DialogFooter className={dialogFooterClass}>
              <DialogClose
                render={<Button variant="ghost" className="h-11 rounded-full px-5" />}
                disabled={isSubmitting}
              >
                {t.common.cancel}
              </DialogClose>
              <Button
                className="h-11 rounded-full px-5"
                disabled={!category || trimmedLength < FEEDBACK_MESSAGE_MIN || isSubmitting}
                onClick={submit}
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {isSubmitting ? t.feedback.submitting : t.feedback.submit}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
