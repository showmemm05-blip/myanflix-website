"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import { CloseIcon } from "./icons";

/** Classes that turn any dialog popup into the phone bottom sheet. `!` so a caller's desktop sizing can't leak in. */
export const SHEET_ON_PHONE =
  "max-desk:top-auto! max-desk:bottom-0! max-desk:left-0! max-desk:w-full! max-desk:max-w-none! max-desk:translate-x-0! max-desk:translate-y-0! max-desk:rounded-t-[20px]! max-desk:rounded-b-none! max-desk:pb-[max(20px,env(safe-area-inset-bottom))]! max-desk:data-open:slide-in-from-bottom-10 max-desk:data-open:zoom-in-100 max-desk:data-closed:slide-out-to-bottom-10 max-desk:data-closed:zoom-out-100";

/**
 * THE BOARD DIALOG FRAME (SHELL.md §15) — "Sort & filter", Deposit,
 * Withdraw, Subscribe, Edit profile…
 *
 * Desktop: centred, max-width 560 (size="lg" 720, "sm" 440), radius 20,
 * popover #16161C, 60% black overlay. Phone (<720px): the same markup docks
 * to the bottom as a sheet with a grabber and 20px top corners.
 * Header (title, optional subtitle, 40px close button) and footer stay
 * pinned; only the body scrolls. Focus is trapped, Esc closes, focus goes
 * back to the opener (base-ui).
 *
 *   <Modal
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Sort & filter"
 *     subtitle="2 applied"
 *     footer={<>
 *       <Button variant="tonal" size="cta" onClick={clear}>Clear all</Button>
 *       <Button variant="commit" size="cta" onClick={apply}>Show 38 results</Button>
 *     </>}
 *   >
 *     …body…
 *   </Modal>
 *
 * Destructive confirmations put a `variant="danger"` button in the footer.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  dismissible = true,
  initialFocus,
  className,
  bodyClassName,
  footerClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  /** Pinned action row. On phones the buttons share the width (first = secondary). */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** false = no close button, and Esc/overlay clicks don't close (e.g. while submitting). */
  dismissible?: boolean;
  /** Element to focus on open (defaults to the first focusable in the popup). */
  initialFocus?: React.RefObject<HTMLElement | null>;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
}) {
  const { t } = useLanguage();

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !dismissible) return;
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 isolate z-[80] bg-black/60 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          initialFocus={initialFocus}
          className={cn(
            "fixed top-1/2 left-1/2 z-[80] flex max-h-[min(86vh,780px)] w-full -translate-x-1/2 -translate-y-1/2 flex-col rounded-[20px] bg-popover text-fg shadow-e3 outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            size === "sm" && "max-w-[min(440px,calc(100%-48px))]",
            size === "md" && "max-w-[min(560px,calc(100%-48px))]",
            size === "lg" && "max-w-[min(720px,calc(100%-48px))]",
            className,
            SHEET_ON_PHONE,
            "max-desk:max-h-[92dvh]! max-desk:pb-0!",
          )}
        >
          <span aria-hidden className="mx-auto mt-2 block h-[5px] w-10 shrink-0 rounded-[3px] bg-white/24 desk:hidden" />
          <div className="flex shrink-0 items-center justify-between gap-4 pt-5 pr-5 pb-4 pl-6 max-desk:pt-3 max-desk:pr-3 max-desk:pb-3 max-desk:pl-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-section-title text-fg max-desk:text-[19px] max-desk:leading-[26px]">
                {title}
              </DialogPrimitive.Title>
              {subtitle && (
                <DialogPrimitive.Description className="mt-0.5 text-[13px] leading-[18px] text-fg-faint">
                  {subtitle}
                </DialogPrimitive.Description>
              )}
            </div>
            {dismissible && (
              <DialogPrimitive.Close
                render={<Button variant="ghost" size="icon-bar" className="bg-tonal-faint hover:bg-tonal-soft" />}
              >
                <CloseIcon size={20} />
                <span className="sr-only">{t.common.close}</span>
              </DialogPrimitive.Close>
            )}
          </div>
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-6 pt-1 pb-6 max-desk:gap-5 max-desk:px-4",
              !footer && "max-desk:pb-[max(20px,env(safe-area-inset-bottom))]",
              bodyClassName,
            )}
          >
            {children}
          </div>
          {footer && (
            <div
              className={cn(
                "flex shrink-0 justify-end gap-3 px-6 pt-4 pb-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                "max-desk:grid max-desk:auto-cols-fr max-desk:grid-flow-col max-desk:px-4 max-desk:pb-[max(20px,env(safe-area-inset-bottom))] max-desk:[&>*]:h-[52px] max-desk:[&>*]:w-full",
                footerClassName,
              )}
            >
              {footer}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
