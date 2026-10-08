"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/lib/context/language-context";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { cn } from "@/lib/utils";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, clampScale, READER_FONT_CLASS, READER_THEME_CLASS, READER_THEME_SWATCH, READER_THEMES, SCALE_MAX, SCALE_MIN, SCALE_STEP, SIZE_PRESET_ORDER, SIZE_PRESETS, type PageBackgroundId, type ReaderSettingsV2, type SizePresetId } from "./reader-settings";
import { useFullscreen } from "./use-fullscreen";
import { ShortcutsHelp } from "./reader-shortcuts";
import { MARQUEE_PANEL_VARS, PanelOverline } from "./ReaderChrome";
import {
  ChevronDownGlyph,
  CloseBookIcon,
  KeyboardIcon,
  MinusIcon,
  MoonIcon,
  PlusGlyph,
  RotateIcon,
  SunIcon,
} from "./reader-icons";

/**
 * The ONE settings surface, shared by both readers (`mode` decides which
 * sections exist). From 720px up it is a 392px pop-up hanging off the toolbar
 * trigger; below that it becomes a bottom sheet — a pop-up on a phone would
 * BE the screen, badly. Always the dark Marquee surface (Reader.dc.html),
 * whatever the reading theme; the theme tiles show the page colours.
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

// ── Small Marquee controls ─────────────────────────────────────────────────

function SectionHeader({
  label,
  open,
  onToggle,
  first = false,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  /** The first section has no hairline above it. */
  first?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        "focus-ring flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-0 text-left text-[15px] font-extrabold text-fg",
        first ? "h-12" : "h-[52px] shadow-[inset_0_1px_0_var(--mq-hairline)]",
      )}
    >
      {label}
      <ChevronDownGlyph
        size={18}
        className={cn("shrink-0 text-fg-muted transition-transform duration-200", open && "rotate-180")}
      />
    </button>
  );
}

/** One segment of a raised segmented track (the reader keeps toggle buttons with aria-pressed). */
function Segment({
  selected,
  onClick,
  label,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={label}
      className={cn(
        "focus-ring h-[38px] min-w-0 flex-1 basis-0 cursor-pointer truncate rounded-[10px] border-0 px-1.5 text-sm whitespace-nowrap transition-colors",
        selected ? "bg-play font-extrabold text-ink" : "bg-transparent font-semibold text-fg-body hover:text-fg",
        className,
      )}
    >
      {label}
    </button>
  );
}

function SegmentRow<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; className?: string }[];
  onSelect: (id: T) => void;
}) {
  const id = `rs-${label.replace(/\s+/g, "-")}`;
  return (
    <div className="mt-3 first:mt-0">
      <PanelOverline id={id}>{label}</PanelOverline>
      <div role="group" aria-labelledby={id} className="mt-2 flex gap-0.5 rounded-[12px] bg-raised p-[3px]">
        {options.map((option) => (
          <Segment
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
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "focus-ring flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent p-0 text-left text-[15px] font-semibold text-fg",
        className,
      )}
    >
      <span className="min-w-0">{label}</span>
      <span
        aria-hidden
        className={cn(
          "relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200",
          // Off is #3A3A44, as on mobile — the raised token is nearly invisible on the pop-up.
          checked ? "bg-crimson" : "bg-[#3A3A44]",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] size-[26px] rounded-full bg-play transition-[left] duration-200",
            checked ? "left-[23px]" : "left-[3px]",
          )}
        />
      </span>
    </button>
  );
}

const roundStep =
  "focus-ring flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-fg transition-colors hover:bg-tonal-ghost disabled:cursor-default disabled:opacity-35";
const squareTool =
  "focus-ring flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border-0 bg-raised text-sm font-bold text-fg-body transition-colors hover:bg-raised-hover disabled:cursor-default disabled:opacity-35";

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
  const p = useSection(playText);
  const rootRef = useRef<HTMLDivElement>(null);

  const isSheet = useMediaQuery("(max-width: 719px)");
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
    <div className="mt-0">
      <PanelOverline id="rs-theme">{p.themeLabel}</PanelOverline>
      <div role="group" aria-labelledby="rs-theme" className="mt-2 grid grid-cols-4 gap-2.5">
        {READER_THEMES.map((name) => {
          const swatch = READER_THEME_SWATCH[name];
          const selected = settings.theme === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange({ theme: name })}
              aria-pressed={selected}
              className="focus-ring flex cursor-pointer flex-col items-center gap-1.5 rounded-[12px] border-0 bg-transparent p-0"
            >
              <span
                aria-hidden
                className="flex h-[52px] w-full items-center justify-center rounded-[12px] text-lg font-extrabold"
                style={{
                  background: swatch.paper,
                  color: swatch.ink,
                  boxShadow: selected
                    ? "inset 0 0 0 2px var(--mq-crimson)"
                    : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                }}
              >
                Aa
              </span>
              <span className={cn("text-[12px] leading-4 font-bold", selected ? "text-link" : "text-fg-muted")}>
                {r.themes[name]}
              </span>
            </button>
          );
        })}
      </div>
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
    s: "text-[13px]",
    m: "text-base",
    l: "text-[19px]",
    xl: "text-[23px]",
  };
  const matchesPreset = (id: SizePresetId) =>
    Math.abs(settings.scale - presetFor(id)) < 0.001;
  const isCustomScale = !SIZE_PRESET_ORDER.some(matchesPreset);

  const sizeRows = (
    <div className="mt-[18px]">
      <PanelOverline id="rs-size">
        {isCustomScale ? `${r.textSize} · ${r.sizeCustom}` : r.textSize}
      </PanelOverline>
      <div role="group" aria-labelledby="rs-size" className="mt-2 grid grid-cols-4 gap-2">
        {SIZE_PRESET_ORDER.map((id) => {
          const selected = matchesPreset(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ scale: presetFor(id) })}
              aria-label={presetLabel[id]}
              aria-pressed={selected}
              title={presetLabel[id]}
              className={cn(
                "focus-ring h-11 cursor-pointer rounded-[12px] border-0 font-extrabold transition-colors",
                presetFontSize[id],
                selected ? "bg-crimson-soft text-link" : "bg-raised text-fg-muted hover:text-fg",
              )}
            >
              A
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange({ scale: clampScale(settings.scale - SCALE_STEP) })}
          disabled={settings.scale <= SCALE_MIN}
          aria-label={r.smaller}
          className={roundStep}
        >
          <MinusIcon size={18} />
        </button>
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
        <button
          type="button"
          onClick={() => onChange({ scale: clampScale(settings.scale + SCALE_STEP) })}
          disabled={settings.scale >= SCALE_MAX}
          aria-label={r.larger}
          className={roundStep}
        >
          <PlusGlyph size={18} />
        </button>
        <span className="w-12 shrink-0 text-right text-[13px] leading-[18px] font-bold text-fg-muted tabular-nums">
          {Math.round(settings.scale * 100)}%
        </span>
      </div>
    </div>
  );

  const brightnessRow = (
    <div className="mt-3.5">
      <PanelOverline>{r.brightness}</PanelOverline>
      <div className="mt-1 flex h-10 items-center gap-3">
        <MoonIcon size={18} className="shrink-0 text-fg-muted" />
        <input
          type="range"
          className="reader-range min-w-0 flex-1"
          aria-label={r.brightness}
          min={BRIGHTNESS_MIN}
          max={BRIGHTNESS_MAX}
          step={0.05}
          value={settings.brightness}
          onChange={(e) => onChange({ brightness: Number(e.target.value) })}
        />
        <SunIcon size={18} className="shrink-0 text-fg-muted" />
        <span className="w-10 shrink-0 text-right text-[13px] leading-[18px] font-bold text-fg-muted tabular-nums">
          {Math.round(settings.brightness * 100)}%
        </span>
      </div>
    </div>
  );

  const appearance = (
    <>
      {themeRow}
      {mode === "text" && (
        <div className="mt-[18px]">
          <SegmentRow
            label={r.fontFamily}
            value={settings.fontFamily}
            onSelect={(fontFamily) => onChange({ fontFamily })}
            options={[
              { id: "serif" as const, label: r.fontSerif, className: READER_FONT_CLASS.serif },
              { id: "sans" as const, label: r.fontSans, className: READER_FONT_CLASS.sans },
              { id: "dyslexic" as const, label: r.fontDyslexic, className: READER_FONT_CLASS.dyslexic },
            ]}
          />
        </div>
      )}
      {mode === "text" && sizeRows}
      {brightnessRow}
    </>
  );

  const layout = mode === "text" && (
    <>
      <SegmentRow
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
      <SegmentRow
        label={r.readingMode}
        value={settings.textPageMode}
        onSelect={(textPageMode) => onChange({ textPageMode })}
        options={[
          { id: "scroll" as const, label: r.modeScroll },
          { id: "paginated" as const, label: r.modePaginated },
        ]}
      />
      <SegmentRow
        label={r.lineSpacing}
        value={settings.lineHeight}
        onSelect={(lineHeight) => onChange({ lineHeight })}
        options={[
          { id: "compact" as const, label: r.lineCompact },
          { id: "normal" as const, label: r.lineNormal },
          { id: "relaxed" as const, label: r.lineRelaxed },
        ]}
      />
      <SegmentRow
        label={r.margins}
        value={settings.margins}
        onSelect={(margins) => onChange({ margins })}
        options={[
          { id: "s" as const, label: r.marginSmall },
          { id: "m" as const, label: r.marginMedium },
          { id: "l" as const, label: r.marginLarge },
        ]}
      />
      <SegmentRow
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
        className="mt-1.5"
      />
    </>
  );

  const backgroundLabel: Record<PageBackgroundId, string> = {
    theme: r.bgTheme,
    black: r.bgBlack,
    gray: r.bgGray,
    white: r.bgWhite,
  };

  const page = mode === "pages" && (
    <>
      <SegmentRow
        label={r.pageLayout}
        value={settings.pageMode}
        onSelect={(pageMode) => onChange({ pageMode })}
        options={[
          { id: "single" as const, label: r.layoutSingle },
          { id: "double" as const, label: r.layoutDouble },
          { id: "scroll" as const, label: r.layoutScroll },
        ]}
      />
      <SegmentRow
        label={p.fitLabel}
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
      <SegmentRow
        label={r.direction}
        value={settings.pageDirection}
        onSelect={(pageDirection) => onChange({ pageDirection })}
        options={[
          { id: "ltr" as const, label: r.dirLtr },
          { id: "rtl" as const, label: r.dirRtl },
        ]}
      />
      <SegmentRow
        label={r.background}
        value={settings.pageBackground}
        onSelect={(pageBackground) => onChange({ pageBackground })}
        options={(Object.keys(backgroundLabel) as PageBackgroundId[]).map((id) => ({
          id,
          label: backgroundLabel[id],
        }))}
      />
      {(zoom || onRotate) && (
        <div className="mt-3.5">
          {zoom && <PanelOverline>{r.zoom}</PanelOverline>}
          <div className="mt-2 flex items-center gap-2">
            {zoom && (
              <>
                <button
                  type="button"
                  onClick={zoom.onZoomOut}
                  disabled={zoom.canZoomOut === false}
                  aria-label={r.zoomOut}
                  title={r.zoomOut}
                  className={cn(squareTool, "w-11 text-fg")}
                >
                  <MinusIcon size={18} />
                </button>
                <span className="w-14 text-center text-[15px] font-extrabold text-fg tabular-nums">
                  {Math.round(zoom.value * 100)}%
                </span>
                <button
                  type="button"
                  onClick={zoom.onZoomIn}
                  disabled={zoom.canZoomIn === false}
                  aria-label={r.zoomIn}
                  title={r.zoomIn}
                  className={cn(squareTool, "w-11 text-fg")}
                >
                  <PlusGlyph size={18} />
                </button>
                <button type="button" onClick={zoom.onReset} className={cn(squareTool, "px-3.5")}>
                  {r.zoomReset}
                </button>
              </>
            )}
            {onRotate && (
              <button type="button" onClick={onRotate} className={cn(squareTool, "ml-auto px-3")}>
                <RotateIcon size={18} />
                {r.rotate}
              </button>
            )}
          </div>
        </div>
      )}
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
      {fs.supported && <SwitchRow label={r.fullscreen} checked={fs.active} onChange={() => fs.toggle()} />}
      {finePointer && (
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="focus-ring mt-1 flex h-12 w-full cursor-pointer items-center gap-3 rounded-[10px] border-0 bg-transparent px-2 text-left text-[15px] font-semibold text-fg-body transition-colors hover:bg-tonal-ghost"
        >
          <KeyboardIcon size={20} className="shrink-0 text-fg-muted" />
          <span className="min-w-0 flex-1 truncate">{r.shortcuts}</span>
          <kbd className="h-[22px] rounded-badge bg-raised px-[7px] font-sans text-[12px] leading-[22px] font-bold text-fg-muted">
            ?
          </kbd>
        </button>
      )}
    </>
  );

  const body = (
    <>
      <div className="flex h-[52px] items-center justify-between">
        <h2 id="reader-settings-title" className="m-0 text-lg leading-6 font-extrabold text-fg">
          {r.settingsTitle}
        </h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label={t.common.close}
          className="focus-ring -mr-1.5 flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-tonal-faint text-fg transition-colors hover:bg-tonal-soft"
        >
          <CloseBookIcon size={18} strokeWidth={2} />
        </button>
      </div>

      <SectionHeader
        label={r.sectionAppearance}
        open={sections.appearance}
        onToggle={() => toggleSection("appearance")}
        first
      />
      {sections.appearance && <div className="pb-4">{appearance}</div>}

      {mode === "text" && (
        <>
          <SectionHeader
            label={r.sectionLayout}
            open={sections.layout}
            onToggle={() => toggleSection("layout")}
          />
          {sections.layout && <div className="pb-3">{layout}</div>}
        </>
      )}

      {mode === "pages" && (
        <>
          <SectionHeader
            label={r.sectionPage}
            open={sections.page}
            onToggle={() => toggleSection("page")}
          />
          {sections.page && <div className="pb-3">{page}</div>}
        </>
      )}

      <SectionHeader
        label={r.sectionBehavior}
        open={sections.behavior}
        onToggle={() => toggleSection("behavior")}
      />
      {sections.behavior && <div>{behavior}</div>}

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
          className="fixed inset-0 z-[60] cursor-default border-0 bg-overlay"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reader-settings-title"
          className="fixed inset-x-0 bottom-0 z-[60] max-h-[82dvh] overflow-y-auto rounded-t-[20px] bg-popover px-[18px] pt-2 text-fg shadow-[0_-24px_64px_rgba(0,0,0,0.5)]"
          style={{
            ...MARQUEE_PANEL_VARS,
            paddingBottom: "calc(18px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <span aria-hidden className="mx-auto mb-1 block h-[5px] w-10 rounded-[3px] bg-white/24" />
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
      aria-labelledby="reader-settings-title"
      className="absolute top-full right-0 z-50 mt-2 max-h-[calc(100dvh-148px)] w-[392px] overflow-y-auto rounded-[16px] bg-popover px-[18px] pt-2 pb-[18px] text-fg shadow-[0_24px_64px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.08)] [scrollbar-width:thin]"
      style={MARQUEE_PANEL_VARS}
    >
      {body}
    </div>
  );
}
