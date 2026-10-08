import { FallbackArt } from "@/components/system/FallbackArt";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

/**
 * GAME ARTWORK — the Marquee scenes the approved Home board (Main.dc.html)
 * draws for each game: sky colour, a glowing sun or moon, a back ridge and a
 * dark foreground (peaks, a city skyline, a lone figure or a pagoda).
 *
 * Inline SVG on purpose: the storefront makes ZERO catalogue requests, and
 * now its artwork costs no requests either — nothing is fetched to paint a
 * game, and nothing can fail to load.
 *
 * Each game keeps the exact palette the board gave it, so the hero, the shelf
 * card, the live thumb and the discover poster of one game are always the
 * same picture in different crops. A game that is not in the table (a new
 * row added to the shelf later) falls back to the foundation's
 * <FallbackArt>, seeded by its title.
 *
 * Fills its positioned parent (absolute inset-0). The parent carries the
 * radius and `overflow-hidden`. `zoom` adds the shared card hover scale.
 */

type Kind = "peaks" | "city" | "figure" | "pagoda";

interface GamePalette {
  bg: string;
  glow: string;
  mid: string;
  dark: string;
  kind: Kind;
  /** Poster sun (viewBox 120×180). */
  mx: number;
  my: number;
  mr: number;
  /** Landscape sun (viewBox 240×135). */
  wx: number;
  wy: number;
  wr: number;
}

/** The board's palette per game id (lib/media/games-data.ts ids). Artwork colours, not UI tokens. */
const PALETTES: Record<string, GamePalette> = {
  "game-lacquer-city": { bg: "#1E1640", glow: "#E0409A", mid: "#33246B", dark: "#0E0A1F", kind: "city", mx: 84, my: 44, mr: 16, wx: 176, wy: 36, wr: 20 },
  "game-monsoon-run": { bg: "#0C2A3A", glow: "#1FB6A6", mid: "#163E66", dark: "#061520", kind: "figure", mx: 36, my: 46, mr: 14, wx: 60, wy: 38, wr: 20 },
  "game-the-long-quiet": { bg: "#17241B", glow: "#93A696", mid: "#26402E", dark: "#0A110C", kind: "city", mx: 80, my: 40, mr: 12, wx: 190, wy: 34, wr: 16 },
  "game-teahouse-letters": { bg: "#2E1D0E", glow: "#C98B3F", mid: "#4A2F16", dark: "#150D05", kind: "figure", mx: 40, my: 50, mr: 18, wx: 70, wy: 40, wr: 22 },
  "game-orbital-ferry": { bg: "#12143A", glow: "#3FD0E0", mid: "#2B2E8F", dark: "#080924", kind: "peaks", mx: 86, my: 42, mr: 15, wx: 186, wy: 34, wr: 18 },
  "game-the-ninth-floor": { bg: "#1A1D33", glow: "#8CA5D9", mid: "#3A2E63", dark: "#0C0A18", kind: "city", mx: 34, my: 44, mr: 12, wx: 56, wy: 34, wr: 16 },
  "game-shwe-market-tycoon": { bg: "#13291D", glow: "#E0B23F", mid: "#1F5A38", dark: "#08140D", kind: "city", mx: 82, my: 48, mr: 16, wx: 180, wy: 38, wr: 20 },
  "game-emberfall": { bg: "#2E0F14", glow: "#E06A2B", mid: "#5A1A26", dark: "#14060A", kind: "peaks", mx: 60, my: 50, mr: 20, wx: 120, wy: 40, wr: 22 },
  "game-delta-drift": { bg: "#0E2238", glow: "#A6E04C", mid: "#1D4A7A", dark: "#06111D", kind: "peaks", mx: 30, my: 44, mr: 12, wx: 52, wy: 32, wr: 16 },
  "game-paper-tigers": { bg: "#2A1512", glow: "#D6C6A3", mid: "#6E2620", dark: "#120806", kind: "peaks", mx: 84, my: 46, mr: 14, wx: 184, wy: 36, wr: 18 },
  "game-starlit-bazaar": { bg: "#1E1638", glow: "#E0C46A", mid: "#3A2A6B", dark: "#0D0A1C", kind: "city", mx: 70, my: 40, mr: 10, wx: 150, wy: 32, wr: 12 },
  "game-signal-thirty": { bg: "#1A1D26", glow: "#E04C4C", mid: "#3C4456", dark: "#0B0D12", kind: "city", mx: 40, my: 46, mr: 14, wx: 64, wy: 36, wr: 18 },
};

/* The board's scene paths (the same set the foundation's FallbackArt draws). */
const POSTER: Record<Kind, readonly [string, string]> = {
  peaks: ["M0 120 L28 92 L50 108 L80 76 L104 100 L120 90 V180 H0 Z", "M0 150 C30 140 60 146 90 136 C104 132 114 134 120 132 V180 H0 Z"],
  city: ["M0 124 L30 100 L54 114 L84 88 L120 108 V180 H0 Z", "M0 140 h10 v-14 h8 v8 h8 v-22 h10 v16 h8 v-8 h10 v14 h8 v-28 h12 v20 h8 v-6 h10 v16 h10 v-10 h8 V180 H0 Z"],
  figure: ["M0 128 C30 118 60 124 90 114 C104 110 114 112 120 110 V180 H0 Z", "M0 150 H120 V180 H0 Z M57 150 l2-24 h-4 l1-10 c0-4 2-6 4-6 c2 0 4 2 4 6 l1 10 h-4 l2 24 z M60 106 a5 5 0 1 0 0.1 0 z"],
  pagoda: ["M0 118 L30 96 L56 110 L88 84 L120 102 V180 H0 Z", "M0 150 H120 V180 H0 Z M44 150 C44 142 50 140 52 134 C54 128 56 126 58 114 L60 96 L62 114 C64 126 66 128 68 134 C70 140 76 142 76 150 Z"],
};
const LAND: Record<Kind, readonly [string, string]> = {
  peaks: ["M0 90 L40 66 L70 80 L110 52 L150 76 L190 60 L240 74 V135 H0 Z", "M0 112 C50 104 100 108 150 100 C190 94 220 96 240 94 V135 H0 Z"],
  city: ["M0 96 L40 70 L70 86 L110 56 L150 84 L182 66 L240 88 V135 H0 Z", "M0 112 h20 v-16 h14 v10 h12 v-24 h16 v18 h14 v-10 h16 v16 h14 v-30 h18 v22 h14 v-6 h16 v20 h18 v-12 h14 v8 h54 V135 H0 Z"],
  figure: ["M0 98 C50 90 100 94 150 86 C190 80 220 82 240 80 V135 H0 Z", "M0 116 H240 V135 H0 Z M166 116 l2-26 h-4 l1-11 c0-4 2-6 4-6 c2 0 4 2 4 6 l1 11 h-4 l2 26 z M169 69 a5 5 0 1 0 0.1 0 z"],
  pagoda: ["M0 96 L40 70 L70 86 L110 56 L150 84 L182 66 L240 88 V135 H0 Z", "M0 114 H240 V135 H0 Z M150 114 C150 106 156 104 158 98 C160 92 162 90 164 80 L165 66 L166 80 C168 90 170 92 172 98 C174 104 180 106 180 114 Z"],
};
const HERO: Record<Kind, readonly [string, string]> = {
  peaks: ["M0 520 L220 400 L380 470 L600 330 L800 440 L1000 360 L1200 430 L1440 380 V810 H0 Z", "M0 650 C260 610 520 640 780 600 C1000 570 1220 590 1440 570 V810 H0 Z"],
  city: ["M0 540 L260 450 L440 500 L680 410 L900 470 L1120 420 L1440 470 V810 H0 Z", "M0 620 h80 v-60 h60 v34 h56 v-96 h76 v70 h56 v-36 h70 v60 h56 v-120 h90 v88 h56 v-28 h76 v66 h70 v-42 h60 v-80 h80 v100 h60 v-50 h70 v40 h80 v-70 h60 v50 h70 v-30 h144 V810 H0 Z"],
  figure: ["M0 560 C300 510 600 540 900 500 C1100 474 1300 486 1440 476 V810 H0 Z", "M0 680 H1440 V810 H0 Z M1000 680 l10-118 h-19 l5-48 c0-19 8-29 19-29 c11 0 19 10 19 29 l5 48 h-19 l10 118 z M1015 481 a22 22 0 1 0 0.1 0 z"],
  pagoda: ["M0 540 L240 450 L420 500 L660 400 L880 470 L1100 410 L1440 460 V810 H0 Z", "M0 660 H1440 V810 H0 Z M900 660 C900 610 940 596 954 560 C968 524 980 510 992 450 L1002 360 L1012 450 C1024 510 1036 524 1050 560 C1064 596 1104 610 1104 660 Z"],
};

/** The coming-soon panel's star dots (board positions, landscape viewBox 240×135). */
const STARS: readonly (readonly [number, number, number])[] = [
  [60, 26, 2],
  [92, 18, 1.5],
  [200, 22, 2],
  [30, 44, 1.2],
  [222, 52, 1.2],
];

/** The game's sky colour — paint it behind the art so a card never flashes black. */
export function gameArtBg(game: Pick<Game, "id">): string | undefined {
  return PALETTES[game.id]?.bg;
}

const ZOOM = "transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/card:scale-[1.04]";

export function GameArt({
  game,
  variant,
  halo = false,
  stars = false,
  shade = false,
  zoom = false,
  className,
}: {
  game: Pick<Game, "id" | "title">;
  /** poster 2:3 · landscape 16:9 · hero 16:9 wide (focal point on the right). */
  variant: "poster" | "landscape" | "hero";
  /**
   * Landscape only: the soft glow around the sun. `true` = the shelf cards'
   * tight halo; "wide" = the duo cards' glow (twice the sun, 14%).
   */
  halo?: boolean | "wide";
  /** Landscape only: the five small star dots of the coming-soon panel. */
  stars?: boolean;
  /** Darken the bottom band so a title set into the art stays readable. */
  shade?: boolean;
  /** The card hover zoom (inside a `group/card`). */
  zoom?: boolean;
  className?: string;
}) {
  const p = PALETTES[game.id];
  const svgClass = cn("absolute inset-0 size-full", zoom && ZOOM, className);

  if (!p) {
    return (
      <FallbackArt
        seed={game.title}
        variant={variant === "hero" ? "hero" : variant === "poster" ? "poster" : "landscape"}
        className={cn(zoom && ZOOM, className)}
      />
    );
  }

  if (variant === "hero") {
    const [back, front] = HERO[p.kind];
    const sx = 900 + p.mx * 3;
    return (
      <svg className={svgClass} viewBox="0 0 1440 810" preserveAspectRatio="xMidYMid slice" aria-hidden focusable={false}>
        <rect width="1440" height="810" fill={p.bg} />
        <circle cx={sx} cy="300" r="280" fill={p.glow} opacity="0.12" />
        <circle cx={sx} cy="300" r="128" fill={p.glow} />
        <path d={back} fill={p.mid} />
        <path d={front} fill={p.dark} />
      </svg>
    );
  }

  if (variant === "landscape") {
    const [back, front] = LAND[p.kind];
    return (
      <svg className={svgClass} viewBox="0 0 240 135" preserveAspectRatio="xMidYMid slice" aria-hidden focusable={false}>
        <rect width="240" height="135" fill={p.bg} />
        {halo === "wide" && <circle cx={p.wx} cy={p.wy} r={p.wr * 2} fill={p.glow} opacity="0.14" />}
        {halo === true && <circle cx={p.wx} cy={p.wy} r={p.wr} fill={p.glow} opacity="0.16" />}
        <circle cx={p.wx} cy={p.wy} r={halo === true ? Math.round(p.wr * 0.9) : p.wr} fill={p.glow} />
        {stars && STARS.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={p.glow} />)}
        <path d={back} fill={p.mid} />
        <path d={front} fill={p.dark} />
        {shade && <rect y="88" width="240" height="47" fill="var(--mq-ground)" opacity="0.35" />}
      </svg>
    );
  }

  const [back, front] = POSTER[p.kind];
  return (
    <svg className={svgClass} viewBox="0 0 120 180" preserveAspectRatio="xMidYMid slice" aria-hidden focusable={false}>
      <rect width="120" height="180" fill={p.bg} />
      <circle cx={p.mx} cy={p.my} r={p.mr} fill={p.glow} />
      <path d={back} fill={p.mid} />
      <path d={front} fill={p.dark} />
      {shade && <rect y="118" width="120" height="62" fill="var(--mq-ground)" opacity="0.35" />}
    </svg>
  );
}
