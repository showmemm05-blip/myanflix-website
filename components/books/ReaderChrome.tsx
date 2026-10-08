"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { cn } from "@/lib/utils";
import { hasMyanmar } from "./reader-settings";
import { BackIcon, CloseBookIcon, ContentsIcon, ForwardChevronIcon } from "./reader-icons";

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

/**
 * Panels, the contents drawer and the settings pop-up always use the dark
 * Marquee surfaces, whatever the reading theme (Reader.dc.html). Everything
 * inside them that still paints from the reader vars (sliders, ReaderButton,
 * search) is re-pointed at the Marquee palette by putting these on the
 * panel's root.
 */
export const MARQUEE_PANEL_VARS = {
  "--ink": "var(--mq-fg)",
  "--ink-soft": "var(--mq-fg-body)",
  "--ink-faint": "var(--mq-fg-faint)",
  "--rule": "var(--mq-hairline)",
  "--accent": "var(--mq-crimson)",
  "--paper": "var(--mq-popover)",
  "--paper-raised": "var(--mq-raised)",
} as React.CSSProperties;

/**
 * Shared shell for both readers' top and bottom bars, so they behave
 * identically: the reading theme's own paper at 94% with a 20px blur, a
 * hairline toward the page, 64px on top. `progress` (0–100) draws the crimson
 * reading-progress line along the top edge of a bottom bar.
 */
export function ReaderBar({
  visible,
  position = "top",
  progress,
  children,
}: {
  visible: boolean;
  position?: "top" | "bottom";
  progress?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 backdrop-blur-[20px] transition-all duration-300",
        position === "top" ? "top-0" : "bottom-0",
        visible
          ? "translate-y-0 opacity-100"
          : position === "top"
            ? "pointer-events-none -translate-y-2 opacity-0"
            : "pointer-events-none translate-y-2 opacity-0",
      )}
      style={{
        background: "color-mix(in oklab, var(--paper) 94%, transparent)",
        color: "var(--ink)",
        boxShadow: position === "top" ? "inset 0 -1px 0 var(--rule)" : undefined,
        // The reader owns the whole viewport now, so it owns the notch and
        // the home indicator too — AppShell used to absorb these.
        paddingTop: position === "top" ? "env(safe-area-inset-top, 0px)" : undefined,
        paddingBottom:
          position === "bottom" ? "env(safe-area-inset-bottom, 0px)" : undefined,
      }}
    >
      {progress !== undefined && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: "var(--rule)" }}
        >
          <span
            className="block h-[3px] bg-crimson transition-[width] duration-300"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * A chrome button that paints itself from the reader theme, not the app
 * palette: a 44px round target in the theme's ink, a grey wash on hover and
 * a soft ink disc when `active` (an open panel, a set bookmark).
 */
export function ReaderButton({
  onClick,
  label,
  disabled,
  active,
  pressed,
  expanded,
  className,
  style,
  children,
}: {
  onClick?: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
  /** aria-pressed without the "on" disc (the bookmark turns crimson instead). */
  pressed?: boolean;
  /** For triggers of a panel (contents, settings) — announced as expanded. */
  expanded?: boolean;
  className?: string;
  style?: React.CSSProperties;
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
      aria-pressed={pressed ?? (expanded === undefined ? active : undefined)}
      aria-expanded={expanded}
      title={label}
      className={cn(
        // 44px everywhere: on a phone these ARE the primary reader controls.
        "focus-ring inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border-0 px-2.5 text-sm font-bold transition-colors duration-150 disabled:cursor-default disabled:opacity-35",
        !active && "bg-transparent enabled:hover:bg-[rgba(128,128,128,0.18)]",
        className,
      )}
      style={{
        color: "var(--ink)",
        ...(active ? { background: "color-mix(in oklab, var(--ink) 12%, transparent)" } : null),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** The small uppercase label used across the dark panels (Theme, Font, Part 1…). */
export function PanelOverline({
  children,
  id,
  as: Tag = "p",
  className,
}: {
  children: React.ReactNode;
  id?: string;
  as?: "p" | "h3" | "span";
  className?: string;
}) {
  const text = typeof children === "string" ? children : "";
  return (
    <Tag
      id={id}
      className={cn(
        "m-0 text-[11px] leading-[14px] font-extrabold text-fg-faint uppercase",
        className,
      )}
      // Myanmar labels (mm is the default locale) must not carry tracking.
      style={{ letterSpacing: hasMyanmar(text) ? 0 : "0.08em" }}
    >
      {children}
    </Tag>
  );
}

/**
 * The contents drawer — closed by default, so the page is the whole screen
 * until the reader asks otherwise. Slides over the text rather than pushing
 * it: reflowing a page of prose to make room for a menu loses the reader's
 * place. Always the dark Marquee surface (#121217), whatever the theme.
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
  readingIn,
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
  /** The language being read, as a word ("English", "မြန်မာ") — shown under the title. */
  readingIn?: string;
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
  const p = useSection(playText);

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
          "fixed inset-0 z-50 cursor-default border-0 bg-overlay transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        inert={!open}
        aria-labelledby="reader-drawer-title"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(380px,88%)] flex-col bg-surface text-fg shadow-[20px_0_48px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          ...MARQUEE_PANEL_VARS,
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-start justify-between gap-3 pt-[18px] pr-3 pb-3 pl-5">
          <div className="min-w-0">
            <h2 id="reader-drawer-title" className="m-0 text-lg leading-6 font-extrabold text-fg">
              {title}
            </h2>
            <p className="m-0 mt-0.5 text-sm leading-5 text-fg-muted">{author}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="focus-ring flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-tonal-faint text-fg transition-colors hover:bg-tonal-soft"
          >
            <CloseBookIcon size={18} strokeWidth={2} />
          </button>
        </div>

        {readingIn && (
          <p className="m-0 px-5 pb-3.5 text-[13px] leading-[18px] font-semibold text-fg-muted">
            {t.book.readingIn(readingIn)}
          </p>
        )}

        {tabs && tabs.length > 0 && (
          <div
            role="tablist"
            aria-label={p.panels}
            className="mx-4 grid gap-0.5 rounded-[12px] bg-raised p-[3px]"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((tab) => {
              const selected = tab.id === active?.id;
              return (
                <button
                  key={tab.id}
                  id={`reader-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="reader-tabpanel"
                  onClick={() => selectTab(tab.id)}
                  className={cn(
                    "focus-ring h-9 min-w-0 cursor-pointer truncate rounded-[10px] border-0 px-1 text-[13px] transition-colors",
                    selected ? "bg-play font-extrabold text-ink" : "bg-transparent font-bold text-fg-muted hover:text-fg",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <div
          id={tabs && tabs.length > 0 ? "reader-tabpanel" : undefined}
          role={tabs && tabs.length > 0 ? "tabpanel" : undefined}
          aria-labelledby={active ? `reader-tab-${active.id}` : undefined}
          className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-5 [scrollbar-color:rgba(128,128,128,0.35)_transparent] [scrollbar-width:thin]"
        >
          {tabs && tabs.length > 0 ? (
            active?.content
          ) : (
            <>
              <PanelOverline className="px-2 pb-2">{t.book.reader.contents}</PanelOverline>
              {children}
            </>
          )}
        </div>

        <Link
          href={`/books/${bookId}`}
          className="focus-ring px-5 py-3.5 text-sm font-semibold text-fg-body shadow-[inset_0_1px_0_var(--mq-hairline)] transition-colors hover:text-fg"
        >
          {t.book.reader.backToBook}
        </Link>
      </aside>
    </>
  );
}

/** The contents-toggle button both readers put at the left of their top bar. */
export function ContentsToggle({ onClick, expanded }: { onClick: () => void; expanded?: boolean }) {
  const { t } = useLanguage();
  return (
    <ReaderButton label={t.book.reader.contents} onClick={onClick} expanded={expanded} active={expanded}>
      <ContentsIcon size={22} />
    </ReaderButton>
  );
}

/** "Close the book" — a link back to the book page, never a button around a link. */
export function CloseBookLink({ bookId }: { bookId: string }) {
  const { t } = useLanguage();
  return (
    <Link
      href={`/books/${bookId}`}
      aria-label={t.book.reader.close}
      title={t.book.reader.close}
      className="focus-ring inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[rgba(128,128,128,0.18)]"
      style={{ color: "var(--ink)" }}
    >
      <CloseBookIcon size={22} />
    </Link>
  );
}

/**
 * The end-of-chapter cards (Reader.dc.html "chapter end"): the previous
 * chapter on a quiet ink-tinted card, the next one on a crimson card — or,
 * on the last chapter, the "you've reached the end" line in its place.
 * Shared by the scanned-page reader's chapter turn.
 */
export function ChapterTurnCards({
  previous,
  next,
  previousLabel,
  nextLabel,
  finishedLabel,
  className,
}: {
  previous: { title: string; onClick: () => void } | null;
  next: { title: string; onClick: () => void } | null;
  previousLabel: string;
  nextLabel: string;
  finishedLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-8 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 font-sans",
        className,
      )}
    >
      {previous && (
        <button
          type="button"
          onClick={previous.onClick}
          className="focus-ring flex min-h-[72px] cursor-pointer items-center gap-3 rounded-[12px] border-0 pr-[18px] pl-3.5 text-left transition-[opacity,transform] hover:opacity-[0.88] active:scale-[0.97]"
          style={{ background: "var(--rule)", color: "var(--ink)" }}
        >
          <BackIcon size={20} className="shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="text-[13px] leading-[18px]" style={{ color: "var(--ink-faint)" }}>
              {previousLabel}
            </span>
            <span className="truncate text-base leading-[22px] font-extrabold">{previous.title}</span>
          </span>
        </button>
      )}
      {next ? (
        <button
          type="button"
          onClick={next.onClick}
          className="focus-ring flex min-h-[72px] cursor-pointer items-center justify-between gap-3 rounded-[12px] border-0 bg-crimson pr-3.5 pl-[18px] text-left text-fg transition-[opacity,transform] hover:opacity-[0.88] active:scale-[0.97]"
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-[13px] leading-[18px] font-semibold">{nextLabel}</span>
            <span className="truncate text-base leading-[22px] font-extrabold">{next.title}</span>
          </span>
          <ForwardChevronIcon size={20} className="shrink-0" />
        </button>
      ) : (
        <p
          className="font-reading m-0 flex min-h-[72px] items-center justify-center text-center text-sm italic"
          style={{ color: "var(--ink-faint)" }}
        >
          {finishedLabel}
        </p>
      )}
    </div>
  );
}
