"use client";

import { hasMyanmar } from "./reader-settings";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/context/language-context";
import type { TranslationShape } from "@/lib/i18n/translations";
import { ReaderButton } from "./ReaderChrome";

type ReaderStrings = TranslationShape["book"]["reader"];
/** Only the plain-string reader keys — the fn-style ones can't label a row. */
type ReaderStringKey = {
  [K in keyof ReaderStrings]: ReaderStrings[K] extends string ? K : never;
}[keyof ReaderStrings];

export interface ShortcutItem {
  /** Rendered as <kbd> chips, in order. */
  keys: string[];
  label: ReaderStringKey;
}

export interface ShortcutGroup {
  id: "nav" | "panels" | "view";
  label: ReaderStringKey;
  items: ShortcutItem[];
}

/**
 * The reader keymap as data — the single source both for this help sheet and
 * for anyone auditing what is bound. The handlers themselves live in the
 * readers (one keydown listener each); this file only DESCRIBES them.
 */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: "nav",
    label: "shortcutGroupNav",
    items: [
      { keys: ["←", "→"], label: "shortcutTurnPage" },
      { keys: ["Shift", "←/→"], label: "shortcutChapters" },
      { keys: ["Space"], label: "shortcutScrollScreen" },
      { keys: ["Home", "End"], label: "shortcutFirstLast" },
    ],
  },
  {
    id: "panels",
    label: "shortcutGroupPanels",
    items: [
      { keys: ["T"], label: "contents" },
      { keys: ["B"], label: "bookmark" },
      { keys: ["S"], label: "settings" },
      { keys: ["/"], label: "searchBook" },
      { keys: ["?"], label: "shortcutHelp" },
      { keys: ["Esc"], label: "shortcutClose" },
    ],
  },
  {
    id: "view",
    label: "shortcutGroupView",
    items: [
      { keys: ["F"], label: "fullscreen" },
      { keys: ["+", "−"], label: "zoom" },
      { keys: ["0"], label: "zoomReset" },
      { keys: ["R"], label: "rotate" },
      { keys: ["G"], label: "thumbnails" },
      { keys: ["D"], label: "pageLayout" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px]"
      style={{
        background: "color-mix(in oklab, var(--ink) 8%, transparent)",
        border: "1px solid var(--rule)",
        color: "var(--ink-soft)",
      }}
    >
      {children}
    </kbd>
  );
}

/**
 * The keyboard-shortcuts sheet, opened by `?` or the Behavior-section link.
 * Portalled to <body>: its trigger lives inside the settings panel inside a
 * transformed ReaderBar, and `fixed` inside a transform is trapped there.
 */
export function ShortcutsHelp({
  open,
  onClose,
  themeClass,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * The reader theme class (READER_THEME_CLASS[theme]) — the --paper/--ink
   * vars live on the reader's root element, and a portal to <body> escapes
   * them, so the sheet re-applies the class itself.
   */
  themeClass?: string;
}) {
  const { t } = useLanguage();
  const r = t.book.reader;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Swallow it: Escape must not also close the settings panel under us.
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center p-4 ${themeClass ?? ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={r.shortcuts}
    >
      <button
        type="button"
        aria-label={t.common.close}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/45"
      />
      <div
        className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl p-5 shadow-e3"
        style={{
          background: "var(--paper-raised)",
          border: "1px solid var(--rule)",
          color: "var(--ink)",
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{r.shortcuts}</h2>
          <ReaderButton label={t.common.close} onClick={onClose}>
            <X className="size-4" />
          </ReaderButton>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.id} className={group.id === "nav" ? "sm:col-span-2" : ""}>
              <h3
                className="mb-2 text-xs font-medium uppercase"
                style={{
                  color: "var(--ink-faint)",
                  letterSpacing: hasMyanmar(r[group.label]) ? 0 : "0.025em",
                }}
              >
                {r[group.label]}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.label + item.keys.join()}
                    className="flex items-center justify-between gap-3 text-sm"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    <span className="min-w-0 truncate">{r[item.label]}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
