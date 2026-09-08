"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { List, X } from "lucide-react";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import { hasMyanmar } from "./reader-settings";

/**
 * Idle time before the chrome fades. Long enough to use it, short enough
 * that it is gone by the time you have read a paragraph.
 */
const IDLE_MS = 2600;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Reveals the reader's bars on any sign of attention and hides them again
 * once the reader settles — the behaviour every dedicated reading app has,
 * and the reason a book fills the screen instead of a content pane.
 *
 * `hold` pins them open: while a panel or menu is up, fading the bar out
 * from under the reader's hand would be hostile.
 *
 * The idle timer NEVER arms when `autoHide` is off or the OS asks for
 * reduced motion — in both cases the bars change only on an explicit
 * toggle/tap, never behind the reader's back on a timer.
 */
export function useReaderChrome(
  hold: boolean,
  options?: { autoHide?: boolean },
) {
  const autoHide = options?.autoHide ?? true;
  const [visible, setVisible] = useState(true);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A timer firing under prefers-reduced-motion is itself unrequested
  // motion, transition or no transition.
  const timerAllowed = autoHide && !reducedMotion;

  // When the timer becomes disabled (setting flipped, or the OS turned
  // reduced motion on) the bars must come back: from here on only an
  // explicit toggle may hide them. Render-phase adjustment, not an effect.
  const [prevTimerAllowed, setPrevTimerAllowed] = useState(timerAllowed);
  if (prevTimerAllowed !== timerAllowed) {
    setPrevTimerAllowed(timerAllowed);
    if (!timerAllowed) setVisible(true);
  }

  const wake = useCallback(() => {
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    if (!timerAllowed) return;
    timer.current = setTimeout(() => setVisible(false), IDLE_MS);
  }, [timerAllowed]);

  /** Explicit show/hide — the tap-the-page gesture, and the only way the
      bars move when the idle timer is disabled. */
  const toggle = useCallback(() => {
    setVisible((current) => {
      if (timer.current) clearTimeout(timer.current);
      const next = !current;
      if (next && timerAllowed)
        timer.current = setTimeout(() => setVisible(false), IDLE_MS);
      return next;
    });
  }, [timerAllowed]);

  useEffect(() => {
    if (hold) {
      // No setVisible here: the returned value ORs in `hold`, so the bars
      // are already pinned. All this has to do is stop the fade timer from
      // firing underneath the open panel.
      if (timer.current) clearTimeout(timer.current);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    if (!timerAllowed) return;
    // Start the fade countdown directly rather than through wake(): the
    // bars already start visible, so all this needs to do is arm the timer.
    timer.current = setTimeout(() => setVisible(false), IDLE_MS);
    const events: (keyof WindowEventMap)[] = [
      "pointermove",
      "pointerdown",
      "keydown",
      "scroll",
    ];
    for (const e of events)
      window.addEventListener(e, wake, { passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, wake);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hold, wake, timerAllowed]);

  return { visible: visible || hold, wake, toggle };
}

/**
 * The in-reader dimmer — "brightness" as a hardware dimmer would do it: a
 * black veil over EVERYTHING, bars included, above every panel. Renders
 * nothing at full brightness. Must be mounted at the reader root, never
 * inside a ReaderBar (whose transform would trap the fixed positioning).
 */
export function ReaderDimOverlay({ brightness }: { brightness: number }) {
  const opacity = Math.min(0.6, Math.max(0, (1 - brightness) * 0.85));
  if (opacity <= 0) return null;
  return (
    <div
      aria-hidden
      className="reader-dim pointer-events-none fixed inset-0 z-[80] bg-black"
      style={{ opacity }}
    />
  );
}

/** Shared shell for both readers' top bar, so they behave identically. */
export function ReaderBar({
  visible,
  position = "top",
  children,
}: {
  visible: boolean;
  position?: "top" | "bottom";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 transition-all duration-300",
        position === "top" ? "top-0" : "bottom-0",
        visible
          ? "translate-y-0 opacity-100"
          : position === "top"
            ? "pointer-events-none -translate-y-2 opacity-0"
            : "pointer-events-none translate-y-2 opacity-0",
      )}
      style={{
        background: "var(--paper)",
        borderTop: position === "bottom" ? "1px solid var(--rule)" : undefined,
        borderBottom: position === "top" ? "1px solid var(--rule)" : undefined,
        // The reader owns the whole viewport now, so it owns the notch and
        // the home indicator too — AppShell used to absorb these.
        paddingTop: position === "top" ? "env(safe-area-inset-top, 0px)" : undefined,
        paddingBottom:
          position === "bottom" ? "env(safe-area-inset-bottom, 0px)" : undefined,
      }}
    >
      {children}
    </div>
  );
}

/** A chrome button that paints itself from the reader theme, not the app palette. */
export function ReaderButton({
  onClick,
  label,
  disabled,
  active,
  className,
  children,
}: {
  onClick?: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // Colour alone cannot carry the state — a screen reader would announce
      // both fit modes identically.
      aria-pressed={active}
      title={label}
      className={cn(
        // min-h/w-11 below sm: on a phone these ARE the primary reader
        // controls, and 28px targets fail the 44pt floor the mobile app
        // holds. From sm up the compact density returns.
        "focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors disabled:opacity-35 sm:min-h-0 sm:min-w-0",
        className,
      )}
      style={{
        color: active ? "var(--ink)" : "var(--ink-soft)",
        background: active
          ? "color-mix(in oklab, var(--ink) 9%, transparent)"
          : "transparent",
      }}
    >
      {children}
    </button>
  );
}


/**
 * The contents drawer — closed by default, so the page is the whole screen
 * until the reader asks otherwise. Slides over the text rather than pushing
 * it: reflowing a page of prose to make room for a menu loses the reader's
 * place.
 */
export interface ContentsDrawerTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function ContentsDrawer({
  open,
  onClose,
  bookId,
  title,
  author,
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  open: boolean;
  onClose: () => void;
  bookId: string;
  title: string;
  author: string;
  /**
   * Contents | Bookmarks | Notes | Search… — when given, the drawer becomes
   * tabbed and `children` is ignored; without it, `children` renders under
   * the classic "Contents" caption exactly as before.
   */
  tabs?: ContentsDrawerTab[];
  /** Controlled active tab id (the search toolbar button opens straight to Search). */
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();

  // Uncontrolled fallback so a tabbed drawer works without wiring state.
  const [internalTab, setInternalTab] = useState<string | undefined>(undefined);
  const currentTab =
    activeTab ?? internalTab ?? (tabs && tabs.length > 0 ? tabs[0].id : undefined);
  const selectTab = (id: string) => {
    setInternalTab(id);
    onTabChange?.(id);
  };
  const active = tabs?.find((tab) => tab.id === currentTab) ?? tabs?.[0];

  // Escape closes it, like any other overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* `inert` rather than aria-hidden: opacity-0 and an off-screen
          transform still leave both the backdrop and every chapter button in
          the tab order, and aria-hidden over focusable children is the exact
          pattern browsers refuse to honour. inert removes them from focus,
          hit-testing and the accessibility tree at once. */}
      <button
        type="button"
        inert={!open}
        aria-label={t.common.close}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-50 cursor-default bg-black/45 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        inert={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[85vw] flex-col shadow-e3 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          background: "var(--paper-raised)",
          borderRight: "1px solid var(--rule)",
          color: "var(--ink)",
        }}
      >
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--rule)" }}
        >
          <div className="min-w-0">
            <p className="font-reading text-base leading-tight font-semibold">
              {title}
            </p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--ink-faint)" }}>
              {author}
            </p>
          </div>
          <ReaderButton label={t.common.close} onClick={onClose}>
            <X className="size-4" />
          </ReaderButton>
        </div>

        {tabs && tabs.length > 0 && (
          <div
            role="tablist"
            className="flex gap-1 px-3 pt-2"
            style={{ borderBottom: "1px solid var(--rule)" }}
          >
            {tabs.map((tab) => {
              const selected = tab.id === active?.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectTab(tab.id)}
                  className="focus-ring min-w-0 flex-1 truncate rounded-t-lg px-2 py-2 text-xs font-medium"
                  style={{
                    color: selected ? "var(--ink)" : "var(--ink-faint)",
                    boxShadow: selected
                      ? "inset 0 -2px 0 var(--accent)"
                      : undefined,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {tabs && tabs.length > 0 ? (
            active?.content
          ) : (
            <>
              <p
                className="px-2 pb-2 text-xs font-medium uppercase"
                style={{
                  color: "var(--ink-faint)",
                  letterSpacing: hasMyanmar(t.book.reader.contents) ? 0 : "0.025em",
                }}
              >
                {t.book.reader.contents}
              </p>
              {children}
            </>
          )}
        </div>

        <Link
          href={`/books/${bookId}`}
          className="focus-ring px-5 py-3.5 text-sm transition-colors"
          style={{
            borderTop: "1px solid var(--rule)",
            color: "var(--ink-soft)",
          }}
        >
          {t.book.reader.backToBook}
        </Link>
      </aside>
    </>
  );
}

/** The contents-toggle button both readers put at the left of their top bar. */
export function ContentsToggle({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <ReaderButton label={t.book.reader.contents} onClick={onClick}>
      <List className="size-4" />
      <span className="hidden sm:inline">{t.book.reader.contents}</span>
    </ReaderButton>
  );
}
