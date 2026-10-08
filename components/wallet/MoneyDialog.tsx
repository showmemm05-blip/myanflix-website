"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { Button } from "@/components/ui/button";
import { SHEET_ON_PHONE } from "@/components/system/Modal";
import { CloseIcon } from "@/components/system";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

/**
 * THE MONEY DIALOG FRAME (Deposit / Withdraw / Subscribe / Withdrawal code
 * boards). The same anatomy as the shared <Modal> — centred 560px r20
 * popover on a 60% overlay, a bottom sheet with a grabber under 720px,
 * pinned header and footer around a scrolling body — but split into parts,
 * because these dialogs change their header, steps and footer as the flow
 * moves (form → code → done), and the part that knows the step draws it.
 *
 *   <MoneyDialog open onOpenChange>
 *     <MoneyDialogHeader title="Deposit funds" subtitle="Step 1 of 2 · …" />
 *     <MoneyStepBars total={2} current={1} />
 *     <MoneyDialogBody>…</MoneyDialogBody>
 *     <MoneyDialogFooter>…buttons…</MoneyDialogFooter>
 *   </MoneyDialog>
 *
 * base-ui traps focus, closes on Esc / overlay click and returns focus to
 * the opener. Callers that must not close mid-request guard onOpenChange.
 */
export function MoneyDialog({
  open,
  onOpenChange,
  children,
  size = "md",
  grabber = true,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** The phone sheet's grabber (Subscribe draws its own over the art). */
  grabber?: boolean;
  /** md = 560 (Deposit, Withdraw, Subscribe) · sm = 480 (Settings › Withdrawal code). */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 isolate z-[80] bg-overlay duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-[80] flex max-h-[min(92vh,940px)] w-full -translate-x-1/2 -translate-y-1/2 flex-col rounded-[20px] bg-popover text-fg shadow-e3 outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            size === "md" ? "max-w-[min(560px,calc(100%-48px))]" : "max-w-[min(480px,calc(100%-48px))]",
            className,
            SHEET_ON_PHONE,
            "max-desk:max-h-[92dvh]! max-desk:pb-0!",
          )}
        >
          {grabber && (
            <span
              aria-hidden
              className="mx-auto mt-2 block h-[5px] w-10 shrink-0 rounded-[3px] bg-tonal-hover desk:hidden"
            />
          )}
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** The 40px round close button (disabled while a request is on its way). */
export function MoneyDialogClose({ disabled, className }: { disabled?: boolean; className?: string }) {
  const { t } = useLanguage();
  return (
    <DialogPrimitive.Close
      disabled={disabled}
      render={
        <Button
          variant="ghost"
          size="icon-bar"
          className={cn("shrink-0 bg-tonal-faint hover:bg-tonal-soft", className)}
        />
      }
    >
      <CloseIcon size={20} />
      <span className="sr-only">{t.common.close}</span>
    </DialogPrimitive.Close>
  );
}

/**
 * Title + grey step line + close. The title is the dialog's accessible name
 * and the step line its description.
 */
export function MoneyDialogHeader({
  title,
  subtitle,
  closeDisabled,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  closeDisabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 pt-5 pr-5 pl-6 max-desk:pt-3 max-desk:pr-3 max-desk:pl-4">
      <div className="min-w-0">
        <DialogPrimitive.Title className="text-section-title text-fg max-desk:text-[19px] max-desk:leading-[26px]">
          {title}
        </DialogPrimitive.Title>
        {subtitle && (
          <DialogPrimitive.Description className="mt-0.5 text-[13px] leading-[18px] text-fg-faint nums">
            {subtitle}
          </DialogPrimitive.Description>
        )}
      </div>
      <MoneyDialogClose disabled={closeDisabled} />
    </div>
  );
}

/** The crimson step bars under the header (aria-hidden: the step line says it). */
export function MoneyStepBars({ total, current, className }: { total: number; current: number; className?: string }) {
  return (
    <div aria-hidden className={cn("flex shrink-0 gap-1.5 px-6 pt-4 max-desk:px-4", className)}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-[2px] transition-colors duration-300",
            i < current ? "bg-crimson" : "bg-tonal",
          )}
        />
      ))}
    </div>
  );
}

/** The scrolling middle. */
export function MoneyDialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-6 pt-5 pb-6 max-desk:gap-5 max-desk:px-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The pinned action row. An `alert` (a form error) sits full width above
 * the buttons. On phones the buttons share the width.
 */
export function MoneyDialogFooter({
  children,
  alert,
  className,
}: {
  children: ReactNode;
  alert?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-3 px-6 pt-4 pb-5 shadow-[inset_0_1px_0_var(--mq-hairline)]",
        "max-desk:px-4 max-desk:pb-[max(20px,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {alert}
      <div className="flex flex-wrap justify-end gap-3 max-desk:grid max-desk:auto-cols-fr max-desk:grid-flow-col max-desk:[&>*]:h-[52px] max-desk:[&>*]:w-full">
        {children}
      </div>
    </div>
  );
}

/** The red footer alert ("Enter an amount between …"). */
export function MoneyAlert({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-[12px] bg-danger/12 px-3.5 py-3 text-[13px] leading-[18px] font-semibold text-danger nums"
    >
      {icon}
      <span>{children}</span>
    </p>
  );
}

/** The grey "label · value" list on the submitted / done screens. */
export function MoneySummaryList({
  rows,
}: {
  rows: { label: ReactNode; value: ReactNode; valueClassName?: string }[];
}) {
  return (
    <dl className="m-0 rounded-[16px] bg-raised px-5 py-1">
      {rows.map((row, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between gap-4 py-3.5",
            i > 0 && "shadow-[inset_0_1px_0_var(--mq-tonal-ghost)]",
          )}
        >
          <dt className="text-[14px] leading-5 text-fg-faint">{row.label}</dt>
          <dd className={cn("m-0 text-right text-[15px] leading-5 font-bold nums", row.valueClassName)}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The green "it went through" disc + title + line at the top of a done screen. */
export function MoneySuccess({
  icon,
  title,
  body,
  as: Heading = "h3",
}: {
  icon: ReactNode;
  title: ReactNode;
  body: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div role="status" className="flex flex-col items-center pt-2 text-center">
      <span
        aria-hidden
        className="mq-rise flex size-[88px] items-center justify-center rounded-full bg-money/14 text-money"
      >
        {icon}
      </span>
      <Heading className="mt-5 text-[24px] leading-[30px] font-extrabold tracking-[-0.02em] text-fg">{title}</Heading>
      <p className="mt-2 max-w-[420px] text-[15px] leading-[23px] text-fg-body">{body}</p>
    </div>
  );
}
