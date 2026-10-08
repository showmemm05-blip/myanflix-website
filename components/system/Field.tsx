import * as React from "react";

import { cn } from "@/lib/utils";
import { AlertCircleIcon, SearchIcon } from "./icons";

/**
 * MARQUEE FORM FIELDS (DesignSystem "Form fields", SHELL.md §14).
 *
 * 52px tall, radius 12, raised #1C1C23, 16px text. Label above (13/18 · 700 ·
 * muted). Focus = 1.5px crimson inner ring. Error = danger ring + a message
 * with an icon. `components/ui/textarea` already uses this look.
 *
 *   <Field id="amount" label="Amount" help="Minimum 1,000 Ks." error={err}>
 *     {(control) => <input {...control} className={fieldClass()} inputMode="numeric" />}
 *   </Field>
 *
 * The render-prop hands you `id`, `aria-describedby` and `aria-invalid`, so
 * the label, help and error are wired for screen readers without guessing.
 * Plain children work too (wire the ids yourself: `${id}-help`, `${id}-error`).
 */
export function fieldClass({ withIcon = false, withSuffix = false }: { withIcon?: boolean; withSuffix?: boolean } = {}) {
  return cn(
    "block h-[52px] w-full min-w-0 rounded-[12px] border-0 bg-raised px-4 text-base text-fg outline-none transition-shadow duration-150",
    "placeholder:text-fg-faint focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)] focus-visible:outline-none",
    "aria-invalid:shadow-[inset_0_0_0_1.5px_var(--mq-danger)] disabled:cursor-not-allowed disabled:opacity-40",
    withIcon && "pl-12",
    withSuffix && "pr-14",
  );
}

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

export function Field({
  id,
  label,
  help,
  error,
  suffix,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  help?: React.ReactNode;
  /** When set, the field shows the danger ring and this message replaces the help. */
  error?: React.ReactNode;
  /** A unit inside the right edge of the box, e.g. "Ks" (give the input `fieldClass({ withSuffix: true })`). */
  suffix?: React.ReactNode;
  className?: string;
  children: React.ReactNode | ((control: FieldControlProps) => React.ReactNode);
}) {
  const helpId = help && !error ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const control: FieldControlProps = {
    id,
    "aria-describedby": errorId ?? helpId,
    ...(error ? { "aria-invalid": true as const } : {}),
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
        {label}
      </label>
      <div className="relative mt-2">
        {typeof children === "function" ? children(control) : children}
        {suffix && (
          <span className="pointer-events-none absolute top-4 right-4 text-sm leading-5 font-bold text-fg-faint">
            {suffix}
          </span>
        )}
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : help ? <FieldHelp id={helpId}>{help}</FieldHelp> : null}
    </div>
  );
}

export function FieldHelp({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("mt-2 text-[13px] leading-[18px] text-fg-faint", className)} {...props} />;
}

export function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      role="alert"
      className={cn("mt-2 flex items-start gap-2 text-[13px] leading-[18px] text-danger", className)}
      {...props}
    >
      <AlertCircleIcon size={16} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** The 52px search box: icon at 16/16, text from 48. Give it an aria-label or a <label>. */
export function SearchField({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <div className="relative">
      <SearchIcon size={20} className="pointer-events-none absolute top-4 left-4 text-fg-faint" />
      <input type="search" className={cn(fieldClass({ withIcon: true }), className)} {...props} />
    </div>
  );
}
