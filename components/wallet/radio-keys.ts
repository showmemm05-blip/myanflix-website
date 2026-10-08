import type { KeyboardEvent } from "react";

/**
 * Keyboard support for the wallet's radio groups (method tiles, deposit
 * accounts, subscription plans), following the usual radio pattern: one Tab
 * stop for the whole group, arrow keys move AND pick, Home / End jump to the
 * first / last option.
 */

/** Only the picked option (or the first, when none is picked) is a Tab stop. */
export function radioTabIndex(index: number, selectedIndex: number): 0 | -1 {
  return (selectedIndex < 0 ? index === 0 : index === selectedIndex) ? 0 : -1;
}

/**
 * Arrow / Home / End on an option: picks the next one through `select` and
 * moves focus to it. Other keys (Space, Enter, Tab) are left to the button.
 */
export function onRadioKeyDown(
  event: KeyboardEvent<HTMLElement>,
  index: number,
  count: number,
  select: (index: number) => void,
): void {
  if (count < 1) return;
  const key = event.key;
  const delta =
    key === "ArrowRight" || key === "ArrowDown" ? 1 : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
  const jump = key === "Home" ? 0 : key === "End" ? count - 1 : null;
  if (!delta && jump === null) return;
  event.preventDefault();
  const next = jump ?? (index + delta + count) % count;
  select(next);
  const group = event.currentTarget.closest('[role="radiogroup"]');
  group?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
}
