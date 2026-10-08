import type { SVGProps } from "react";

/**
 * The player's own glyphs, drawn from Player.dc.html (24×24, round caps).
 * Shared Marquee icons (Play, Close, Chevron…) come from
 * `@/components/system`; these are the ones only the player draws.
 * Always decorative — every control that uses one carries its own label.
 */
export type PlayerIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function stroke({ size = 22, strokeWidth = 1.75, ...props }: PlayerIconProps) {
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

function solid({ size = 22, ...props }: PlayerIconProps) {
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

export const PauseGlyph = (p: PlayerIconProps) => (
  <svg {...solid(p)}>
    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
  </svg>
);

export const PlayGlyph = (p: PlayerIconProps) => (
  <svg {...solid(p)}>
    <path d="M7 4.8v14.4c0 .8.9 1.3 1.6.8l11-7.2c.6-.4.6-1.2 0-1.6l-11-7.2C7.9 3.5 7 4 7 4.8z" />
  </svg>
);

/** Back 10 — `withNumber` sets the "10" inside the arc (the big centre button). */
export const ReplayIcon = ({ withNumber, ...p }: PlayerIconProps & { withNumber?: boolean }) => (
  <svg {...stroke(p)}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
    <path d="M4.5 3.5v4h4" />
    {withNumber && (
      <text x="12.2" y="15" textAnchor="middle" fontSize="6.6" fontWeight="800" fill="currentColor" stroke="none">
        10
      </text>
    )}
  </svg>
);

export const ForwardIcon = ({ withNumber, ...p }: PlayerIconProps & { withNumber?: boolean }) => (
  <svg {...stroke(p)}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" />
    <path d="M19.5 3.5v4h-4" />
    {withNumber && (
      <text x="11.8" y="15" textAnchor="middle" fontSize="6.6" fontWeight="800" fill="currentColor" stroke="none">
        10
      </text>
    )}
  </svg>
);

export const NextEpisodeIcon = (p: PlayerIconProps) => (
  <svg {...solid(p)}>
    <path d="M5 5.6v12.8c0 .8.9 1.2 1.5.8l9-6.4c.5-.4.5-1.2 0-1.6l-9-6.4C5.9 4.4 5 4.8 5 5.6z" />
    <path d="M17.5 5h2.2v14h-2.2z" />
  </svg>
);

export const VolumeIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);

export const VolumeLowIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6" />
  </svg>
);

export const MutedIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </svg>
);

export const SubtitlesIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h12A2.5 2.5 0 0 1 20.5 7v10a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17z" />
    <path d="M7 12.5h4M13.5 12.5H17M7 15.5h6" />
  </svg>
);

export const AudioIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 10.5v3" />
  </svg>
);

export const EpisodesIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M3.5 6h12M3.5 11h12M3.5 16h7" />
    <path d="M16 14v6l5-3z" fill="currentColor" />
  </svg>
);

export const TheaterIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <rect x="3" y="6.5" width="18" height="11" rx="2" />
  </svg>
);

export const FullscreenIcon = (p: PlayerIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </svg>
);

export const ExitFullscreenIcon = (p: PlayerIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />
  </svg>
);

export const GearIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M12 3l1.6 2.3 2.8-.6.6 2.8L19.3 9l-1 2.6 1 2.6-2.3 1.5-.6 2.8-2.8-.6L12 21l-1.6-2.1-2.8.6-.6-2.8L4.7 14.2l1-2.6-1-2.6 2.3-1.5.6-2.8 2.8.6z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const WifiIcon = (p: PlayerIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M2.5 9a14 14 0 0 1 19 0" />
    <path d="M5.5 12.5a9.5 9.5 0 0 1 13 0" />
    <path d="M8.5 16a5 5 0 0 1 7 0" />
    <path d="M12 19.5h.01" />
  </svg>
);

export const WifiLowIcon = (p: PlayerIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M2.5 9a14 14 0 0 1 19 0" opacity="0.3" />
    <path d="M5.5 12.5a9.5 9.5 0 0 1 13 0" opacity="0.3" />
    <path d="M8.5 16a5 5 0 0 1 7 0" />
    <path d="M12 19.5h.01" />
  </svg>
);

export const WifiOffIcon = (p: PlayerIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M2.5 9a14 14 0 0 1 4.6-3M10.5 4.6A14 14 0 0 1 21.5 9" />
    <path d="M5.5 12.5a9.5 9.5 0 0 1 4-2.2M15.6 10.9a9.5 9.5 0 0 1 2.9 1.6" />
    <path d="M8.5 16a5 5 0 0 1 7 0" />
    <path d="M12 19.5h.01" />
    <path d="M3 3l18 18" />
  </svg>
);

export const DownloadIcon = (p: PlayerIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
  </svg>
);

export const SignInIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M10 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8" />
    <path d="M4 12h10" />
    <path d="M10 8l4 4-4 4" />
  </svg>
);

export const HourglassIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M7 3.5h10M7 20.5h10M8 3.5v3.2a4 4 0 0 0 1.6 3.2L12 12l2.4-2.1A4 4 0 0 0 16 6.7V3.5M8 20.5v-3.2a4 4 0 0 1 1.6-3.2L12 12l2.4 2.1a4 4 0 0 1 1.6 3.2v3.2" />
  </svg>
);

export const WarningIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M12 4 2.8 19.5h18.4z" />
    <path d="M12 10v4.5M12 17.5v.01" />
  </svg>
);

export const NoVideoIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
    <path d="M4 4l16 16" />
  </svg>
);

export const EmptyBoxIcon = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M4 8.5h16v11H4z" />
    <path d="M6.5 5.5h11M9 3h6" />
  </svg>
);

export const CloudOffGlyph = (p: PlayerIconProps) => (
  <svg {...stroke(p)}>
    <path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 9.3 4.4 4.4 0 0 0 7 18z" />
    <path d="M4 4l16 16" />
  </svg>
);

export const BackChevronIcon = (p: PlayerIconProps) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

/** The crimson tick disc used in the speed/quality and subtitle menus. */
export const SelectedTick = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable={false}>
    <circle cx="12" cy="12" r="10" fill="var(--mq-crimson)" />
    <path
      d="M7.5 12.3l3 3 6-6.3"
      fill="none"
      stroke="var(--mq-fg)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
