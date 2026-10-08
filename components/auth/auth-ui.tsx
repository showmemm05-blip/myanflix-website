"use client";

import { useState, type ComponentProps, type ReactNode, type SVGProps } from "react";

import { AlertCircleIcon, CheckIcon } from "@/components/system/icons";
import { useSection } from "@/lib/i18n/sections/define";
import { authText, formatMyanmarPhone } from "@/lib/i18n/sections/auth";
import { cn } from "@/lib/utils";

/**
 * THE SIGN-IN KIT — the small pieces every step of /login, /register and
 * /forgot-password is built from (Login / LoginCode / Register /
 * ForgotPassword boards): the crimson step rail, the step heading, the
 * "+95 … · Change" number chip, the fields with show/hide, the six code
 * cells, the inline error line and the quiet text actions.
 */

/* ── Board icons not in the shared set (24×24, stroke 1.75) ─────────────── */

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function strokeProps({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export const PhoneIcon = (p: IconProps) => (
  <svg {...strokeProps(p)}>
    <path d="M6.6 3.5h2.6l1.4 4-2 1.4a12 12 0 0 0 6.5 6.5l1.4-2 4 1.4v2.6a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" />
  </svg>
);
export const PadlockIcon = (p: IconProps) => (
  <svg {...strokeProps(p)}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
export const ShieldCheckIcon = (p: IconProps) => (
  <svg {...strokeProps(p)}>
    <path d="M12 3.5l7 2.8v5.2c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6.3z" />
    <path d="M9 12.2l2.2 2.2 4-4.2" />
  </svg>
);
export const EyeIcon = ({ slashed, ...p }: IconProps & { slashed?: boolean }) => (
  <svg {...strokeProps(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
    {slashed && <path d="M4 4l16 16" />}
  </svg>
);
export const MessageIcon = (p: IconProps) => (
  <svg {...strokeProps(p)}>
    <path d="M5 18.5V7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6a2.5 2.5 0 0 1-2.5 2.5H9.5z" />
    <path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" />
  </svg>
);
export const TelegramIcon = (p: IconProps) => (
  <svg {...strokeProps(p)}>
    <path d="M20.5 3.5L3.5 10.6l6.4 2.5 2.5 6.4z" />
    <path d="M20.5 3.5L9.9 13.1" />
  </svg>
);
export const ViberIcon = (p: IconProps) => (
  <svg {...strokeProps(p)}>
    <path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-4 3.5V17H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
  </svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...strokeProps(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const RefreshIcon = (p: IconProps) => (
  <svg {...strokeProps(p)}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.5 4.5v4h-4" />
  </svg>
);
export const SlidersIcon = (p: IconProps) => (
  <svg {...strokeProps(p)}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);
export const BackIcon = (p: IconProps) => (
  <svg {...strokeProps({ strokeWidth: 2, ...p })}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

/* ── Step rail ─────────────────────────────────────────────────────────── */

/**
 * The crimson step rail: done and current segments are crimson, upcoming
 * ones 16% white. Labels: current white, done crimson text, upcoming faint.
 * `current` is 0-based.
 */
export function StepRail({ label, steps, current }: { label: string; steps: string[]; current: number }) {
  const a = useSection(authText);
  return (
    <ol
      aria-label={label}
      className="m-0 grid list-none gap-2 p-0"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const done = index < current;
        const now = index === current;
        return (
          <li key={step} aria-current={now ? "step" : undefined} className="min-w-0">
            <span
              aria-hidden
              className={cn(
                "block h-1 rounded-[2px] transition-colors duration-[250ms]",
                index <= current ? "bg-crimson" : "bg-tonal",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "text-overline mt-2 block truncate uppercase",
                now ? "text-fg" : done ? "text-link" : "text-fg-faint",
              )}
            >
              {step}
            </span>
            <span className="sr-only">{done ? a.stepDone(step) : now ? a.stepCurrent(step) : step}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Step heading ──────────────────────────────────────────────────────── */

/** The step's h1 (32–40px, 900). Burmese gets taller lines and no negative tracking. */
export const STEP_TITLE_CLASS =
  "mt-[22px] text-[clamp(32px,2.8vw,40px)] leading-[1.15] font-black tracking-[-0.03em] text-fg [:lang(my)_&]:leading-[1.45] [:lang(my)_&]:tracking-normal";
export const STEP_SUBTITLE_CLASS =
  "mt-2.5 text-[17px] leading-[26px] text-fg-muted [:lang(my)_&]:leading-[30px]";

export function StepHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <>
      <h1 className={STEP_TITLE_CLASS}>{title}</h1>
      {subtitle && <p className={STEP_SUBTITLE_CLASS}>{subtitle}</p>}
    </>
  );
}

/** The grey note under a step ("One number covers both…"). */
export function StepFootnote({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-sm leading-[21px] text-fg-faint">{children}</p>;
}

/** The green-tick line under the number chip on the code steps. */
export function DoneNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3.5 flex items-start gap-2 text-sm leading-5 text-fg-muted">
      <CheckIcon size={18} className="mt-px shrink-0 text-money" />
      <span>{children}</span>
    </p>
  );
}

/* ── The number chip ───────────────────────────────────────────────────── */

/**
 * "+95 9 781 234 567 | Change" — which number this is all about, and the
 * way back to the phone step. The accessible name says the whole sentence
 * ("Signing in as … Change phone number").
 */
export function PhoneChip({
  phone,
  label,
  onChange,
  disabled,
}: {
  phone: string;
  /** The full accessible name. */
  label: string;
  onChange: () => void;
  disabled?: boolean;
}) {
  const a = useSection(authText);
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-label={label}
      className="mt-[18px] inline-flex h-10 max-w-full cursor-pointer items-center gap-2.5 rounded-full border-0 bg-raised pr-3.5 pl-3 text-fg outline-none transition-colors duration-150 hover:bg-raised-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:cursor-not-allowed disabled:opacity-60"
    >
      <PhoneIcon size={16} className="shrink-0 text-fg-faint" />
      <span className="nums truncate text-[15px] leading-5 font-bold">{formatMyanmarPhone(phone)}</span>
      <span aria-hidden className="h-4 w-px shrink-0 bg-hairline-strong" />
      <span className="shrink-0 text-sm leading-5 font-extrabold text-link">{a.change}</span>
    </button>
  );
}

/* ── Errors ────────────────────────────────────────────────────────────── */

/** The board's inline error line (14/20, danger, alert icon). Announced when it appears. */
export function AuthError({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <p id={id} role="alert" className={cn("mt-2.5 flex items-start gap-2 text-sm leading-5 text-danger", className)}>
      <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function FieldLabel({ htmlFor, className, children }: { htmlFor: string; className?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-[13px] leading-[18px] font-bold text-fg-muted", className)}>
      {children}
    </label>
  );
}

export function FieldHelpText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-2 text-[13px] leading-[18px] text-fg-faint">
      {children}
    </p>
  );
}

const FIELD =
  "block h-[52px] w-full min-w-0 rounded-[12px] border-0 bg-raised text-base text-fg outline-none transition-shadow duration-150 placeholder:text-fg-faint focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)] aria-invalid:shadow-[inset_0_0_0_1.5px_var(--mq-danger)] disabled:cursor-not-allowed disabled:opacity-60";

/* ── Phone field (fixed +95 prefix) ────────────────────────────────────── */

export function PhoneInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <div className="relative mt-2">
      <span aria-hidden className="nums pointer-events-none absolute top-[15px] left-4 text-base leading-[22px] font-extrabold text-fg">
        +95
      </span>
      <span aria-hidden className="pointer-events-none absolute top-4 left-[60px] h-5 w-px bg-hairline-strong" />
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        className={cn(FIELD, "nums pr-4 pl-[74px] tracking-[0.02em]", className)}
        {...props}
      />
    </div>
  );
}

/* ── Password field with show / hide ───────────────────────────────────── */

export function PasswordInput({
  showLabel,
  icon = "lock",
  className,
  ...props
}: ComponentProps<"input"> & {
  /** The show/hide button's name ("Show password"). */
  showLabel: string;
  /** Lock for the password itself, shield for the confirmation. */
  icon?: "lock" | "shield";
}) {
  const [visible, setVisible] = useState(false);
  const Icon = icon === "shield" ? ShieldCheckIcon : PadlockIcon;
  return (
    <div className="relative mt-2">
      <Icon size={20} className="pointer-events-none absolute top-4 left-4 text-fg-faint" />
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(FIELD, "pr-14 pl-12", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={showLabel}
        aria-pressed={visible}
        disabled={props.disabled}
        className="absolute top-1 right-1 flex size-11 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-fg-muted outline-none transition-colors duration-150 hover:bg-tonal-faint hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-link disabled:cursor-not-allowed disabled:opacity-60"
      >
        <EyeIcon size={20} slashed={visible} />
      </button>
    </div>
  );
}

/* ── The six code cells ────────────────────────────────────────────────── */

/**
 * Six cells drawn over ONE real input (transparent, on top), so typing,
 * pasting the whole text message and the phone's one-time-code autofill all
 * work as one field. The cells are decoration; the input carries the label.
 */
export function CodeCells({
  value,
  invalid,
  busy,
  className,
  ...inputProps
}: Omit<ComponentProps<"input">, "value"> & { value: string; invalid?: boolean; busy?: boolean }) {
  const digits = value.slice(0, 6);
  const active = Math.min(digits.length, 5);
  return (
    <div className={cn("group relative mt-2 h-16", className)}>
      <div aria-hidden className="grid grid-cols-6 gap-2.5 max-desk:gap-2">
        {Array.from({ length: 6 }, (_, index) => {
          const ch = digits.charAt(index);
          return (
            <span
              key={index}
              className={cn(
                "nums flex h-16 items-center justify-center rounded-[12px] text-[28px] leading-[34px] font-extrabold text-fg transition-[box-shadow,background-color] duration-150",
                ch ? "bg-raised-hover" : "bg-raised",
                invalid && ch && "shadow-[inset_0_0_0_1.5px_var(--mq-danger)]",
                !invalid &&
                  !busy &&
                  index === active &&
                  "group-focus-within:shadow-[inset_0_0_0_2px_var(--mq-crimson)]",
                // In error the cells are red, so the crimson ring would vanish
                // into them: the box being typed in gets the site's focus
                // outline instead, so keyboard focus is never invisible.
                invalid &&
                  !busy &&
                  index === active &&
                  "group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-link",
                busy && "opacity-60",
              )}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-invalid={invalid || undefined}
        className="absolute inset-0 h-16 w-full cursor-text border-0 bg-transparent p-0 text-base text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed"
        {...inputProps}
      />
    </div>
  );
}

/** "Your text will look like this — MyanFlix: 482 913". */
export function SmsSampleCard() {
  const a = useSection(authText);
  return (
    <div className="mt-6 flex items-center gap-3 rounded-[12px] bg-surface py-3 pr-4 pl-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-crimson-soft">
        <MessageIcon size={20} className="text-link" />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] leading-4 font-bold text-fg-faint">{a.smsSampleLabel}</div>
        <div className="nums mt-0.5 text-[17px] leading-6 font-extrabold tracking-[0.02em] text-fg" lang="en">
          {a.smsSample}
        </div>
      </div>
    </div>
  );
}

/* ── Quiet actions ─────────────────────────────────────────────────────── */

/**
 * A 44px-tall text action (crimson by default). `locked` keeps it in the tab
 * order (aria-disabled) but makes the click a no-op, so focus never drops
 * to the page while a request is in flight or the resend wait runs.
 */
export function TextAction({
  locked,
  tone = "link",
  icon,
  children,
  onClick,
  className,
  ...props
}: Omit<ComponentProps<"button">, "disabled"> & {
  locked?: boolean;
  tone?: "link" | "plain" | "muted";
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-disabled={locked || undefined}
      onClick={(event) => {
        if (locked) return;
        onClick?.(event);
      }}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[6px] border-0 bg-transparent p-0 text-left text-[15px] leading-[22px] font-extrabold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
        tone === "link" && "text-link hover:text-link-hover hover:underline hover:underline-offset-3",
        tone === "plain" && "text-fg hover:text-link",
        tone === "muted" && "nums cursor-default font-bold text-fg-faint",
        locked && tone !== "muted" && "cursor-not-allowed opacity-60 hover:no-underline",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function Hairline({ className }: { className?: string }) {
  return <div aria-hidden className={cn("mt-8 h-px bg-hairline", className)} />;
}
