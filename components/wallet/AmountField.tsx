"use client";

import type { ReactNode } from "react";
import { AlertCircleIcon } from "@/components/system";
import { cn } from "@/lib/utils";

export const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

/**
 * The money dialogs' big amount field (Deposit / Withdraw boards): 48px
 * figures with commas, a grey "Ks", a hairline underneath that turns
 * crimson while typing and red on an error, then the range line (or the
 * error in its place, announced once as an alert). The value handed out is
 * digits only.
 */
export function AmountField({
  id,
  label,
  value,
  onChange,
  help,
  error,
  autoFocus,
}: {
  id: string;
  label: string;
  /** Digits only ("10000"). */
  value: string;
  onChange: (digits: string) => void;
  help?: ReactNode;
  error?: string | null;
  autoFocus?: boolean;
}) {
  const digits = value.replace(/\D/g, "");
  const shown = digits ? Number(digits).toLocaleString("en-US") : "";
  const helpId = `${id}-help`;
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
        {label}
      </label>
      <div
        className={cn(
          "mt-1.5 flex h-16 items-center gap-2.5 transition-shadow duration-150",
          error
            ? "shadow-[inset_0_-2px_0_var(--mq-danger)]"
            : "shadow-[inset_0_-1px_0_var(--mq-tonal)] focus-within:shadow-[inset_0_-2px_0_var(--mq-crimson)]",
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="10,000"
          value={shown}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10))}
          aria-describedby={help || error ? helpId : undefined}
          aria-invalid={error ? true : undefined}
          className="h-16 min-w-0 flex-1 border-0 bg-transparent p-0 text-[48px] leading-[64px] font-black tracking-[-0.03em] text-fg outline-none nums placeholder:text-fg-decor focus:shadow-none max-desk:text-[40px]"
        />
        <span aria-hidden className="shrink-0 text-[22px] leading-7 font-extrabold text-fg-faint">
          Ks
        </span>
      </div>
      {(help || error) && (
        <p
          // A fresh node for the error, so role="alert" is announced on arrival.
          key={error ? "error" : "help"}
          id={helpId}
          role={error ? "alert" : undefined}
          className={cn(
            "mt-2 flex items-start gap-1.5 text-[13px] leading-[18px] nums",
            error ? "text-danger" : "text-fg-faint",
          )}
        >
          {error && <AlertCircleIcon size={16} className="mt-px shrink-0" />}
          <span>{error ?? help}</span>
        </p>
      )}
    </div>
  );
}

/** Four amount shortcuts — white when they match the field. */
export function QuickAmounts({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: string;
  onSelect: (digits: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="mt-3.5 grid grid-cols-4 gap-2 max-desk:grid-cols-2">
      {QUICK_AMOUNTS.map((qa) => {
        const active = Number(value) === qa;
        return (
          <button
            key={qa}
            type="button"
            onClick={() => onSelect(qa.toString())}
            aria-pressed={active}
            className={cn(
              "mq-press h-11 rounded-[12px] px-1 text-[14px] font-extrabold outline-none nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
              active ? "bg-play text-ink" : "bg-raised text-fg hover:bg-raised-hover",
            )}
          >
            {qa.toLocaleString("en-US")}
          </button>
        );
      })}
    </div>
  );
}
