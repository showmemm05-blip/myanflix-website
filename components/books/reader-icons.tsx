import type { SVGProps } from "react";

/**
 * The reader's own glyphs, drawn from Reader.dc.html (24×24, round caps).
 * Shared Marquee icons (Close, Search, Bookmark, Chevron…) come from
 * `@/components/system`. Always decorative — controls carry their own label.
 */
export type ReaderIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function stroke({ size = 22, strokeWidth = 1.75, ...props }: ReaderIconProps) {
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

/** Close the book — the X at the far left of the top bar. */
export const CloseBookIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ContentsIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <path d="M4.5 6.5v.01M4.5 12v.01M4.5 17.5v.01" strokeWidth={2.6} />
  </svg>
);

export const ReaderSearchIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);

/** The ribbon bookmark; `filled` paints it solid (crimson via currentColor). */
export const RibbonIcon = ({ filled, ...p }: ReaderIconProps & { filled?: boolean }) => (
  <svg {...stroke(p)} fill={filled ? "currentColor" : "none"}>
    <path d="M6.5 4.5h11v15.5l-5.5-3.8-5.5 3.8z" />
  </svg>
);

/** "Aa" — reading settings. */
export const TypeSettingsIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <path d="M2.5 19L8 5l5.5 14M4.6 14h6.8" />
    <path d="M15 19l3.5-9 3.5 9M16.2 16h4.6" />
  </svg>
);

export const ExpandIcon = (p: ReaderIconProps) => (
  <svg {...stroke({ strokeWidth: 1.9, ...p })}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </svg>
);

export const CollapseIcon = (p: ReaderIconProps) => (
  <svg {...stroke({ strokeWidth: 1.9, ...p })}>
    <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />
  </svg>
);

/** The page-thumbnail strip toggle. */
export const PagesStripIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <rect x="3.5" y="4" width="17" height="10" rx="1.5" />
    <path d="M4 18.5h3M10.5 18.5h3M17 18.5h3" />
  </svg>
);

export const BackIcon = (p: ReaderIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const ForwardChevronIcon = (p: ReaderIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const FirstIcon = (p: ReaderIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M17 5l-7 7 7 7M10 5l-7 7 7 7" />
  </svg>
);

export const LastIcon = (p: ReaderIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M7 5l7 7-7 7M14 5l7 7-7 7" />
  </svg>
);

export const MinusIcon = (p: ReaderIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M5 12h14" />
  </svg>
);

export const PlusGlyph = (p: ReaderIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M5 12h14M12 5v14" />
  </svg>
);

export const MoonIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />
  </svg>
);

export const SunIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>
);

export const KeyboardIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
  </svg>
);

export const RotateIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" />
    <path d="M19.5 3.5v4h-4" />
  </svg>
);

export const TrashIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" />
  </svg>
);

export const DeviceIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <rect x="7" y="3" width="10" height="18" rx="2.5" />
    <path d="M11 17.5h2" />
  </svg>
);

export const NoteIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-4 3.5V17H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
  </svg>
);

export const CopyIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
  </svg>
);

export const CloudOffReaderIcon = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 9.3 4.4 4.4 0 0 0 7 18z" />
    <path d="M4 4l16 16" />
  </svg>
);

export const ChevronDownGlyph = (p: ReaderIconProps) => (
  <svg {...stroke({ strokeWidth: 2.2, ...p })}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const BookGlyph = (p: ReaderIconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
  </svg>
);

/** The chapter-opening ornament (two rules and a diamond). Colour from currentColor. */
export const Ornament = ({ className }: { className?: string }) => (
  <svg width="52" height="12" viewBox="0 0 44 12" aria-hidden focusable={false} className={className}>
    <path d="M2 6h14M28 6h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M22 1.5l4.5 4.5-4.5 4.5-4.5-4.5z" fill="currentColor" />
  </svg>
);
