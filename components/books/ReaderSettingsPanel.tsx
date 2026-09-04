"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Keyboard,
  Maximize,
  Minimize,
  Minus,
  Plus,
  RotateCw,
} from "lucide-react";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, clampScale, hasMyanmar, PAGE_BACKGROUND_VALUE, READER_FONT_CLASS, READER_THEME_CLASS, READER_THEME_SWATCH, READER_THEMES, SCALE_MAX, SCALE_MIN, SCALE_STEP, SIZE_PRESET_ORDER, SIZE_PRESETS, type PageBackgroundId, type ReaderSettingsV2, type SizePresetId } from "./reader-settings";
import { useFullscreen } from "./use-fullscreen";
import { ShortcutsHelp } from "./reader-shortcuts";

/**
 * The ONE settings surface, shared by both readers (`mode` decides which
 * sections exist). ≥sm it is an anchored popover hanging off the toolbar
 * trigger; <sm it becomes a bottom sheet — a 20rem popover on a phone would
 * BE the screen, badly.
 *
 * Three collapsible sections, Appearance open by default: everything at once
 * is a preferences page, and this must stay a reading-side adjustment.
 */

export interface ReaderZoomControls {
  value: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
}

export interface ReaderSettingsPanelProps {
  mode: "text" | "pages";
  settings: ReaderSettingsV2;
  onChange: (patch: Partial<ReaderSettingsV2>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Element that counts as "inside" for the outside-press dismissal —
   * normally a wrapper around trigger + panel, so pressing the trigger
   * doesn't close-then-reopen. Falls back to the panel itself.
   */
  dismissRef?: React.RefObject<HTMLElement | null>;
  /** Page readers wire the zoom row to per-book view memory. Row hidden when absent. */
  zoom?: ReaderZoomControls;
  /** Rotate button (page readers). Hidden when absent. */
  onRotate?: () => void;
  /** Override the built-in document-level fullscreen wiring if the reader owns one. */
  fullscreen?: { supported: boolean; active: boolean; toggle: () => void };
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

// ── Small painted-from-theme controls ──────────────────────────────────────

function SectionHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="focus-ring flex min-h-11 w-full items-center justify-between rounded-lg px-1 py-2.5 sm:min-h-0"
    >
      <span
        className="text-xs font-medium uppercase"
        style={{
          color: "var(--ink-faint)",
          // Myanmar section labels (mm is the default locale) must not carry
          // the Latin eyebrow tracking.
          letterSpacing: hasMyanmar(label) ? 0 : "0.025em",
        }}
      >
        {label}
      </span>
      <ChevronDown
        className={cn("size-4 transition-transform", open && "rotate-180")}
        style={{ color: "var(--ink-faint)" }}
      />
    </button>
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs" style={{ color: "var(--ink-faint)" }}>
      {children}
    </p>
  );
}

function Chip({
  selected,
  onClick,
  label,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      className={cn(
        "focus-ring min-h-11 min-w-0 flex-1 rounded-lg px-2 py-1.5 text-center text-xs transition-colors sm:min-h-0",
        className,
      )}
      style={{
        border: selected ? "1px solid var(--accent)" : "1px solid var(--rule)",
        background: selected
          ? "color-mix(in oklab, var(--ink) 9%, transparent)"
          : "transparent",
        color: selected ? "var(--ink)" : "var(--ink-soft)",
      }}
    >
      {children ?? label}
    </button>
  );
}

function ChipRow<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  /** Omitted where the chips label themselves (the fit row). */
  label?: string;
  value: T;
  options: { id: T; label: string; className?: string }[];
  onSelect: (id: T) => void;
}) {
  return (
    <div className="mb-4">
      {label !== undefined && <RowLabel>{label}</RowLabel>}
      <div className="flex gap-1.5">
        {options.map((option) => (
          <Chip
            key={option.id}
            selected={value === option.id}
            onClick={() => onSelect(option.id)}
            label={option.label}
            className={option.className}
          />
        ))}
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="focus-ring mb-1 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-sm sm:min-h-0"
      style={{ color: "var(--ink-soft)" }}
    >
      <span className="min-w-0 truncate text-left">{label}</span>
      <span
        aria-hidden
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
        style={{
          background: checked
            ? "var(--accent)"
            : "color-mix(in oklab, var(--ink) 20%, transparent)",
        }}
      >
        <span
          className={cn(
            "inline-block size-3.5 rounded-full bg-white transition-transform",
            checked ? "translate-x-[1.125rem]" : "translate-x-[0.1875rem]",
          )}
        />
      </span>
    </button>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  readout,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  readout?: string;
}) {
  return (
    <div className="mb-4">
      <RowLabel>{label}</RowLabel>
      <div className="flex items-center gap-3">
        <input
          type="range"
          className="reader-range min-w-0 flex-1"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {readout !== undefined && (
          <span
            className="nums w-11 shrink-0 text-right text-xs"
            style={{ color: "var(--ink-soft)" }}
          >
            {readout}
          </span>
        )}
      </div>
    </div>
  );
}

// ── The panel ──────────────────────────────────────────────────────────────

export function ReaderSettingsPanel({
  mode,
  settings,
  onChange,
  open,
  onOpenChange,
  dismissRef,
  zoom,
  onRotate,
  fullscreen,
}: ReaderSettingsPanelProps) {
  const { t } = useLanguage();
  const r = t.book.reader;
  const rootRef = useRef<HTMLDivElement>(null);

  const isSheet = useMediaQuery("(max-width: 639px)");
  const finePointer = useMediaQuery("(pointer: fine)");

  // Expansion is session state on purpose — the panel always reopens in its
  // predictable shape.
  const [sections, setSections] = useState({
    appearance: true,
    layout: false,
    page: false,
    behavior: false,
  });
  const toggleSection = (id: keyof typeof sections) =>
    setSections((s) => ({ ...s, [id]: !s[id] }));

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const internalFullscreen = useFullscreen();
  const fs = fullscreen ?? internalFullscreen;

  /**
   * Dismiss on an outside press, via a capture-phase document listener
   * rather than a full-screen overlay element: an overlay would be `fixed`
   * inside ReaderBar, which carries a `translate`, and a transformed
   * ancestor becomes the containing block for fixed descendants — it would
   * only ever cover the bar. (The <sm sheet is portalled and uses a scrim.)
   */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const inside = dismissRef?.current ?? rootRef.current;
      if (inside && !inside.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (!isSheet)
      document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange, dismissRef, isSheet]);

  if (!open) return null;

  const themeRow = (
    <div className="mb-4 grid grid-cols-4 gap-1.5">
      {READER_THEMES.map((name) => {
        const swatch = READER_THEME_SWATCH[name];
        const selected = settings.theme === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange({ theme: name })}
            aria-pressed={selected}
            className="focus-ring min-h-11 rounded-lg py-2.5 text-center text-xs sm:min-h-0"
            style={{
              background: swatch.paper,
              color: swatch.ink,
              border: selected
                ? "2px solid var(--accent)"
                : "1px solid var(--rule)",
            }}
          >
            {r.themes[name]}
          </button>
        );
      })}
    </div>
  );

  const presetFor = (id: SizePresetId) => SIZE_PRESETS[id];
  const presetLabel: Record<SizePresetId, string> = {
    s: r.sizeSmall,
    m: r.sizeMedium,
    l: r.sizeLarge,
    xl: r.sizeXL,
  };
  const presetFontSize: Record<SizePresetId, string> = {
    s: "text-[11px]",
    m: "text-[13px]",
    l: "text-[15px]",
    xl: "text-[17px]",
  };
  const matchesPreset = (id: SizePresetId) =>
    Math.abs(settings.scale - presetFor(id)) < 0.001;
  const isCustomScale = !SIZE_PRESET_ORDER.some(matchesPreset);

  const sizeRows = (
    <div className="mb-4">
      <RowLabel>
        {r.textSize}
        {isCustomScale ? ` · ${r.sizeCustom}` : ""}
      </RowLabel>
      <div className="mb-2 flex gap-1.5">
        {SIZE_PRESET_ORDER.map((id) => (
          <Chip
            key={id}
            selected={matchesPreset(id)}
            onClick={() => onChange({ scale: presetFor(id) })}
            label={presetLabel[id]}
          >
            <span className={cn("leading-none", presetFontSize[id])}>A</span>
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          className="reader-range min-w-0 flex-1"
          aria-label={r.textSize}
          min={SCALE_MIN}
          max={SCALE_MAX}
          step={SCALE_STEP}
          value={settings.scale}
          onChange={(e) => onChange({ scale: clampScale(Number(e.target.value)) })}
        />
        <span
          className="nums w-11 shrink-0 text-right text-xs"
          style={{ color: "var(--ink-soft)" }}
        >
          {Math.round(settings.scale * 100)}%
        </span>
      </div>
    </div>
  );

  const appearance = (
    <>
      {themeRow}
      {mode === "text" && (
        <ChipRow
          label={r.fontFamily}
          value={settings.fontFamily}
          onSelect={(fontFamily) => onChange({ fontFamily })}
          options={[
            {
              id: "serif" as const,
              label: r.fontSerif,
              className: READER_FONT_CLASS.serif,
            },
            {
              id: "sans" as const,
              label: r.fontSans,
              className: READER_FONT_CLASS.sans,
            },
            {
              id: "dyslexic" as const,
              label: r.fontDyslexic,
              className: READER_FONT_CLASS.dyslexic,
            },
          ]}
        />
      )}
      {mode === "text" && sizeRows}
      <SliderRow
        label={r.brightness}
        value={settings.brightness}
        min={BRIGHTNESS_MIN}
        max={BRIGHTNESS_MAX}
        step={0.05}
        onChange={(brightness) => onChange({ brightness })}
        readout={`${Math.round(settings.brightness * 100)}%`}
      />
    </>
  );

  const layout = mode === "text" && (
    <>
      <ChipRow
        label={r.readingMode}
        value={settings.textPageMode}
        onSelect={(textPageMode) => onChange({ textPageMode })}
        options={[
          { id: "scroll" as const, label: r.modeScroll },
          { id: "paginated" as const, label: r.modePaginated },
        ]}
      />
      <ChipRow
        label={r.lineSpacing}
        value={settings.lineHeight}
        onSelect={(lineHeight) => onChange({ lineHeight })}
        options={[
          { id: "compact" as const, label: r.lineCompact },
          { id: "normal" as const, label: r.lineNormal },
          { id: "relaxed" as const, label: r.lineRelaxed },
        ]}
      />
      <ChipRow
        label={r.readingWidth}
        value={settings.width}
        onSelect={(width) => onChange({ width })}
        options={[
          { id: "narrow" as const, label: r.widthNarrow },
          { id: "medium" as const, label: r.widthMedium },
          { id: "wide" as const, label: r.widthWide },
          { id: "full" as const, label: r.widthFull },
        ]}
      />
      <ChipRow
        label={r.margins}
        value={settings.margins}
        onSelect={(margins) => onChange({ margins })}
        options={[
          { id: "s" as const, label: r.marginSmall },
          { id: "m" as const, label: r.marginMedium },
          { id: "l" as const, label: r.marginLarge },
        ]}
      />
      <ChipRow
        label={r.alignment}
        value={settings.textAlign}
        onSelect={(textAlign) => onChange({ textAlign })}
        options={[
          { id: "justify" as const, label: r.alignJustify },
          { id: "left" as const, label: r.alignLeft },
        ]}
      />
      <SwitchRow
        label={r.chapterTitleToggle}
        checked={settings.showChapterTitle}
        onChange={(showChapterTitle) => onChange({ showChapterTitle })}
      />
    </>
  );

  const backgroundSwatch: Record<PageBackgroundId, string> = {
    theme: PAGE_BACKGROUND_VALUE.theme,
    black: PAGE_BACKGROUND_VALUE.black,
    gray: PAGE_BACKGROUND_VALUE.gray,
    white: PAGE_BACKGROUND_VALUE.white,
  };
  const backgroundLabel: Record<PageBackgroundId, string> = {
    theme: r.bgTheme,
    black: r.bgBlack,
    gray: r.bgGray,
    white: r.bgWhite,
  };

  const page = mode === "pages" && (
    <>
      <ChipRow
        label={r.pageLayout}
        value={settings.pageMode}
        onSelect={(pageMode) => onChange({ pageMode })}
        options={[
          { id: "single" as const, label: r.layoutSingle },
          { id: "double" as const, label: r.layoutDouble },
          { id: "scroll" as const, label: r.layoutScroll },
        ]}
      />
      <ChipRow
        value={settings.fit}
        onSelect={(fit) => onChange({ fit })}
        options={[
          { id: "width" as const, label: r.fitWidth },
          // In scroll mode 'height' is meaningless — the list is a vertical
          // ribbon, so only width/screen are offered there.
          ...(settings.pageMode === "scroll"
            ? []
            : [{ id: "height" as const, label: r.fitHeight }]),
          { id: "screen" as const, label: r.fitScreen },
        ]}
      />
      {zoom && (
        <div className="mb-4">
          <RowLabel>{r.zoom}</RowLabel>
          <div className="flex items-center gap-1.5">
            <Chip
              selected={false}
              onClick={zoom.onZoomOut}
              label={r.zoomOut}
              className={cn(
                "flex items-center justify-center",
                zoom.canZoomOut === false && "pointer-events-none opacity-35",
              )}
            >
              <Minus className="mx-auto size-3.5" />
            </Chip>
            <span
              className="nums flex-1 text-center text-xs"
              style={{ color: "var(--ink-soft)" }}
            >
              {Math.round(zoom.value * 100)}%
            </span>
            <Chip
              selected={false}
              onClick={zoom.onZoomIn}
              label={r.zoomIn}
              className={cn(
                "flex items-center justify-center",
                zoom.canZoomIn === false && "pointer-events-none opacity-35",
              )}
            >
              <Plus className="mx-auto size-3.5" />
            </Chip>
            <Chip selected={false} onClick={zoom.onReset} label={r.zoomReset} />
          </div>
        </div>
      )}
      {onRotate && (
        <div className="mb-4 flex gap-1.5">
          <Chip
            selected={false}
            onClick={onRotate}
            label={r.rotate}
            className="flex items-center justify-center gap-1.5"
          >
            <RotateCw className="size-3.5" />
            <span>{r.rotate}</span>
          </Chip>
        </div>
      )}
      <ChipRow
        label={r.direction}
        value={settings.pageDirection}
        onSelect={(pageDirection) => onChange({ pageDirection })}
        options={[
          { id: "ltr" as const, label: r.dirLtr },
          { id: "rtl" as const, label: r.dirRtl },
        ]}
      />
      <div className="mb-2">
        <RowLabel>{r.background}</RowLabel>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(backgroundSwatch) as PageBackgroundId[]).map((id) => {
            const selected = settings.pageBackground === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ pageBackground: id })}
                aria-pressed={selected}
                aria-label={backgroundLabel[id]}
                title={backgroundLabel[id]}
                className="focus-ring flex flex-col items-center gap-1 rounded-lg px-1 py-2"
                style={{
                  border: selected
                    ? "1px solid var(--accent)"
                    : "1px solid var(--rule)",
                }}
              >
                <span
                  aria-hidden
                  className="size-5 rounded-full"
                  style={{
                    background: backgroundSwatch[id],
                    border: "1px solid var(--rule)",
                  }}
                />
                <span
                  className="text-[10px]"
                  style={{ color: selected ? "var(--ink)" : "var(--ink-soft)" }}
                >
                  {backgroundLabel[id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  const behavior = (
    <>
      <SwitchRow
        label={r.keepAwake}
        checked={settings.keepAwake}
        onChange={(keepAwake) => onChange({ keepAwake })}
      />
      <SwitchRow
        label={r.autoHideControls}
        checked={settings.autoHideChrome}
        onChange={(autoHideChrome) => onChange({ autoHideChrome })}
      />
      {fs.supported && (
        <button
          type="button"
          onClick={fs.toggle}
          className="focus-ring mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-sm"
          style={{ color: "var(--ink-soft)" }}
        >
          <span className="min-w-0 truncate text-left">
            {fs.active ? r.exitFullscreen : r.fullscreen}
          </span>
          {fs.active ? (
            <Minimize className="size-4 shrink-0" />
          ) : (
            <Maximize className="size-4 shrink-0" />
          )}
        </button>
      )}
      {finePointer && (
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="focus-ring mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-sm"
          style={{ color: "var(--ink-soft)" }}
        >
          <span className="min-w-0 truncate text-left">{r.shortcuts}</span>
          <Keyboard className="size-4 shrink-0" />
        </button>
      )}
    </>
  );

  const body = (
    <>
      <p
        className="px-1 pb-1 text-sm font-semibold"
        style={{ color: "var(--ink)" }}
      >
        {r.settingsTitle}
      </p>

      <SectionHeader
        label={r.sectionAppearance}
        open={sections.appearance}
        onToggle={() => toggleSection("appearance")}
      />
      {sections.appearance && <div className="px-1 pb-1">{appearance}</div>}

      {mode === "text" && (
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHeader
            label={r.sectionLayout}
            open={sections.layout}
            onToggle={() => toggleSection("layout")}
          />
          {sections.layout && <div className="px-1 pb-1">{layout}</div>}
        </div>
      )}

      {mode === "pages" && (
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHeader
            label={r.sectionPage}
            open={sections.page}
            onToggle={() => toggleSection("page")}
          />
          {sections.page && <div className="px-1 pb-1">{page}</div>}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--rule)" }}>
        <SectionHeader
          label={r.sectionBehavior}
          open={sections.behavior}
          onToggle={() => toggleSection("behavior")}
        />
        {sections.behavior && <div className="px-1 pb-2">{behavior}</div>}
      </div>

      <ShortcutsHelp
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        themeClass={READER_THEME_CLASS[settings.theme]}
      />
    </>
  );

  if (isSheet) {
    // Bottom sheet, portalled to <body>: `fixed` inside the transformed
    // ReaderBar is trapped in the bar. The wrapper re-applies the theme
    // class because the CSS vars live on the reader root, not on <body>.
    return createPortal(
      <div className={READER_THEME_CLASS[settings.theme]}>
        <button
          type="button"
          aria-label={t.common.close}
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-[60] cursor-default bg-black/45"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={r.settingsTitle}
          className="fixed inset-x-0 bottom-0 z-[60] max-h-[80dvh] overflow-y-auto rounded-t-2xl p-4"
          style={{
            background: "var(--paper-raised)",
            borderTop: "1px solid var(--rule)",
            color: "var(--ink)",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {body}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={r.settingsTitle}
      className="absolute top-full right-0 z-50 mt-2 max-h-[70dvh] w-80 overflow-y-auto rounded-xl p-3 shadow-e3"
      style={{
        background: "var(--paper-raised)",
        border: "1px solid var(--rule)",
        color: "var(--ink)",
      }}
    >
      {body}
    </div>
  );
}
