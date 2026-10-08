"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * MARQUEE SEGMENTED CONTROL — 2 to 4 options in a raised pill track
 * (SHELL.md §13). Selected = white with ink text (800); others = muted text.
 *
 * A real radiogroup: one tab stop, ←/→ (and ↑/↓) move AND select, Home/End
 * jump to the ends — the WAI-ARIA radio pattern.
 *
 *   <SegmentedControl
 *     label="Access"
 *     value={access}
 *     onChange={setAccess}
 *     options={[{ value: "all", label: "All" }, { value: "free", label: "Free" }]}
 *   />
 *
 * `size="sm"` is the 30px language switch; `fit` makes the track hug its
 * content instead of splitting the width into equal columns.
 */
export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional: lang="my" on a Burmese label inside an English page, etc. */
  lang?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  labelledBy,
  size = "md",
  fit = false,
  className,
}: {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group (or pass `labelledBy`). */
  label?: string;
  labelledBy?: string;
  size?: "sm" | "md";
  fit?: boolean;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.filter((o) => !o.disabled);

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key) || enabled.length === 0) return;
    event.preventDefault();
    const current = enabled.findIndex((o) => o.value === options[index].value);
    let next = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % enabled.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + enabled.length) % enabled.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = enabled.length - 1;
    const target = enabled[next];
    onChange(target.value);
    refs.current[options.indexOf(target)]?.focus();
  };

  const selectedIsEnabled = options.some((o) => o.value === value && !o.disabled);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cn(
        "gap-1 rounded-full bg-raised",
        size === "sm" ? "flex gap-0.5 p-[3px]" : "p-1",
        fit || size === "sm" ? "inline-flex" : "grid",
        className,
      )}
      style={!fit && size !== "sm" ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        // Roving tab stop: the selected option, or the first enabled one.
        const tabbable = selectedIsEnabled ? selected : option === enabled[0];
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={option.lang}
            disabled={option.disabled}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border-0 whitespace-nowrap transition-colors duration-150 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:shrink-0",
              size === "sm" ? "h-[30px] px-3 text-[13px]" : "h-9 px-3 text-sm",
              selected ? "bg-play font-extrabold text-ink" : "bg-transparent font-bold text-fg-muted hover:text-fg",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
