"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/lib/context/language-context";
import type { TranslationShape } from "@/lib/i18n/translations";
import { MARQUEE_PANEL_VARS, PanelOverline } from "./ReaderChrome";
import { CloseBookIcon } from "./reader-icons";

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
    <kbd className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-badge bg-raised px-[7px] font-sans text-[12px] leading-[22px] font-bold text-fg-body">
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
      className={`fixed inset-0 z-[90] flex items-center justify-center p-4 max-desk:items-end max-desk:p-0 ${themeClass ?? ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-shortcuts-title"
    >
      <button
        type="button"
        aria-label={t.common.close}
        onClick={onClose}
        className="absolute inset-0 cursor-default border-0 bg-overlay"
      />
      <div
        className="relative max-h-[85dvh] w-full max-w-[560px] overflow-y-auto rounded-dialog bg-popover p-6 text-fg shadow-e3 max-desk:max-w-none max-desk:rounded-b-none max-desk:pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
        style={MARQUEE_PANEL_VARS}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="reader-shortcuts-title" className="m-0 text-section-title text-fg">
            {r.shortcuts}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="focus-ring flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-tonal-faint text-fg transition-colors hover:bg-tonal-soft"
          >
            <CloseBookIcon size={20} />
          </button>
        </div>

        <div className="grid gap-6 desk:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.id} className={group.id === "nav" ? "desk:col-span-2" : ""}>
              <PanelOverline as="h3" className="mb-2.5">
                {r[group.label]}
              </PanelOverline>
              <ul className="m-0 list-none space-y-2 p-0">
                {group.items.map((item) => (
                  <li
                    key={item.label + item.keys.join()}
                    className="flex items-center justify-between gap-3 text-sm leading-5 text-fg-body"
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
