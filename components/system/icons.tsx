import type { SVGProps } from "react";

/**
 * MARQUEE ICONS — the exact stroke paths drawn on the approved boards
 * (DesignSystem.dc.html / SHELL.md): 24×24, stroke 1.75, round caps and
 * joins, always `aria-hidden`. Play, Crown and Star are filled glyphs.
 *
 * Icon-only controls must carry their own `aria-label`; the icon never
 * names anything. Size with `size` (px) or a `size-*` class.
 *
 * lucide-react is still fine for anything not drawn here — use
 * `strokeWidth={1.75}` so it matches.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function stroke({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
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

function solid({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

/* ── Filled glyphs ─────────────────────────────────────────────────────── */
export const PlayIcon = (p: IconProps) => (
  <svg {...solid(p)}>
    <path d="M7 4.8v14.4c0 .8.9 1.3 1.6.8l11-7.2c.6-.4.6-1.2 0-1.6l-11-7.2C7.9 3.5 7 4 7 4.8z" />
  </svg>
);
export const CrownIcon = (p: IconProps) => (
  <svg {...solid(p)}>
    <path d="M3 18h18l1-11-5.5 4L12 4 7.5 11 2 7z" />
  </svg>
);
export const StarIcon = (p: IconProps) => (
  <svg {...solid(p)}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
  </svg>
);

/* ── Actions ───────────────────────────────────────────────────────────── */
export const PlusIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const CloseIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const ChevronUpIcon = (p: IconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);
export const SearchIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);
export const FilterIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);
export const GridComfortableIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </svg>
);
export const GridCompactIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <rect x="4" y="4" width="4" height="4" rx="1" />
    <rect x="10" y="4" width="4" height="4" rx="1" />
    <rect x="16" y="4" width="4" height="4" rx="1" />
    <rect x="4" y="10" width="4" height="4" rx="1" />
    <rect x="10" y="10" width="4" height="4" rx="1" />
    <rect x="16" y="10" width="4" height="4" rx="1" />
    <rect x="4" y="16" width="4" height="4" rx="1" />
    <rect x="10" y="16" width="4" height="4" rx="1" />
    <rect x="16" y="16" width="4" height="4" rx="1" />
  </svg>
);
export const InfoIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
);
export const AlertCircleIcon = (p: IconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </svg>
);
export const ShareIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M12 4v11" />
    <path d="M8 8l4-4 4 4" />
    <path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" />
  </svg>
);
export const LockIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M5.5 11h13a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1z" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/* ── Navigation (dock + top bar) ───────────────────────────────────────── */
export const HomeIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5.5h-6V20H5a1 1 0 0 1-1-1z" />
  </svg>
);
export const MediaIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM10 9v6l5-3z" />
  </svg>
);
export const WalletIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5zM15 12h2.5" />
  </svg>
);
export const LibraryIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M5 4h4v16H5zM10.5 4h4v16h-4zM16 5.2l3.6-1 3.4 14.6-3.6 1z" />
  </svg>
);
export const BellIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </svg>
);

/* ── Account menu ──────────────────────────────────────────────────────── */
export const ProfileIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);
export const SettingsIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M12 3l1.6 2.3 2.8-.6.6 2.8L19.3 9l-1 2.6 1 2.6-2.3 1.5-.6 2.8-2.8-.6L12 21l-1.6-2.1-2.8.6-.6-2.8L4.7 14.2l1-2.6-1-2.6 2.3-1.5.6-2.8 2.8.6z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const ReceiptIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);
export const HistoryIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4h4" />
    <path d="M12 8v4l3 2" />
  </svg>
);
export const FeedbackIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-4 3.5V17H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
  </svg>
);
export const GlobeIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </svg>
);
export const SignOutIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 8l-4 4 4 4" />
    <path d="M6 12h10" />
  </svg>
);
export const PeopleIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 19a6 6 0 0 1 12 0" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
    <path d="M17.5 13.5A6 6 0 0 1 21 19" />
  </svg>
);

/* ── States ────────────────────────────────────────────────────────────── */
export const CloudOffIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 9.3 4.4 4.4 0 0 0 7 18z" />
    <path d="M4 4l16 16" />
  </svg>
);
export const BookmarkIcon = (p: IconProps) => (
  <svg {...stroke(p)}>
    <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
  </svg>
);
