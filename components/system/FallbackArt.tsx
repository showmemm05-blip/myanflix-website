import { cn } from "@/lib/utils";

/**
 * FALLBACK ART — the artwork a title gets when it has no image yet.
 *
 * An inline SVG scene (sky, glow, a back ridge and a dark foreground) drawn
 * from the approved boards' shared sample art (SHELL.md §18), picked by a
 * hash of the seed — so the same title always gets the same picture, the
 * page never asks a remote placeholder service for anything, and a row of
 * art-less titles still reads as a row of different films.
 *
 * It only paints the scene. The card around it lays the title over the art
 * (the cards do this automatically when they fall back).
 *
 *   <FallbackArt seed={movie.title} variant="poster" />
 *
 * Fills its positioned parent (absolute inset-0) unless you pass a className
 * that says otherwise.
 */
export type FallbackArtVariant = "poster" | "landscape" | "hero" | "book";

type Kind = "peaks" | "city" | "figure" | "pagoda";

/** bg, glow, mid, dark, mx, my, mr, kind — the boards' sample catalogue. */
const PALETTES: ReadonlyArray<readonly [string, string, string, string, number, number, number, Kind]> = [
  ["#1B2A3A", "#E8A33D", "#22374C", "#0B1520", 40, 50, 18, "figure"],
  ["#0F2830", "#7FD6C2", "#164049", "#06171B", 84, 46, 16, "peaks"],
  ["#33200F", "#F2A65A", "#4A2F16", "#150D05", 46, 54, 17, "city"],
  ["#3A2A12", "#E9B949", "#4F3A18", "#160F06", 60, 58, 18, "peaks"],
  ["#191633", "#C9C3F5", "#262250", "#0B0919", 82, 44, 12, "city"],
  ["#232033", "#B9A6FA", "#322E47", "#0F0D17", 80, 44, 13, "city"],
  ["#2B2B30", "#D8D2C4", "#3A3A41", "#121215", 36, 42, 14, "peaks"],
  ["#2A1B3D", "#F2B66D", "#3B2752", "#140C1E", 84, 44, 16, "pagoda"],
  ["#2E1420", "#E86A5C", "#43202F", "#13070D", 76, 40, 13, "city"],
  ["#10243F", "#5AB8F0", "#183459", "#06101F", 34, 46, 14, "figure"],
  ["#1A2617", "#A8C97F", "#26361F", "#0A1008", 70, 48, 12, "peaks"],
  ["#12303A", "#F5D06B", "#1A4250", "#06161B", 88, 56, 16, "figure"],
  ["#13283A", "#F07C5A", "#1D3A52", "#08131D", 78, 44, 15, "peaks"],
  ["#14262B", "#E7C27A", "#1E383E", "#081316", 36, 48, 15, "figure"],
  ["#2C1018", "#F0506A", "#431A25", "#13060A", 82, 42, 14, "peaks"],
  ["#26221A", "#D9B77C", "#3A3426", "#100E09", 40, 40, 13, "city"],
  ["#14193A", "#8FA8FF", "#1F2754", "#090B1C", 74, 50, 14, "city"],
  ["#2A2416", "#F2C66B", "#3E3520", "#120F07", 30, 44, 15, "pagoda"],
  ["#1A2433", "#F5D06B", "#26354A", "#0A0F17", 86, 46, 13, "pagoda"],
  ["#16261A", "#B8D98A", "#213A27", "#09130B", 40, 52, 14, "peaks"],
  ["#1C1B24", "#9FD3E6", "#2A2936", "#0B0A10", 76, 40, 13, "peaks"],
];

/** Posters, viewBox 0 0 120 180. */
const ART: Record<Kind, readonly [string, string]> = {
  peaks: ["M0 120 L28 92 L50 108 L80 76 L104 100 L120 90 V180 H0 Z", "M0 150 C30 140 60 146 90 136 C104 132 114 134 120 132 V180 H0 Z"],
  city: ["M0 124 L30 100 L54 114 L84 88 L120 108 V180 H0 Z", "M0 140 h10 v-14 h8 v8 h8 v-22 h10 v16 h8 v-8 h10 v14 h8 v-28 h12 v20 h8 v-6 h10 v16 h10 v-10 h8 V180 H0 Z"],
  figure: ["M0 128 C30 118 60 124 90 114 C104 110 114 112 120 110 V180 H0 Z", "M0 150 H120 V180 H0 Z M57 150 l2-24 h-4 l1-10 c0-4 2-6 4-6 c2 0 4 2 4 6 l1 10 h-4 l2 24 z M60 106 a5 5 0 1 0 0.1 0 z"],
  pagoda: ["M0 118 L30 96 L56 110 L88 84 L120 102 V180 H0 Z", "M0 150 H120 V180 H0 Z M44 150 C44 142 50 140 52 134 C54 128 56 126 58 114 L60 96 L62 114 C64 126 66 128 68 134 C70 140 76 142 76 150 Z"],
};
/** Landscape, viewBox 0 0 240 135. */
const LAND: Record<Kind, readonly [string, string]> = {
  peaks: ["M0 90 L40 66 L70 80 L110 52 L150 76 L190 60 L240 74 V135 H0 Z", "M0 112 C50 104 100 108 150 100 C190 94 220 96 240 94 V135 H0 Z"],
  city: ["M0 96 L40 70 L70 86 L110 56 L150 84 L182 66 L240 88 V135 H0 Z", "M0 112 h20 v-16 h14 v10 h12 v-24 h16 v18 h14 v-10 h16 v16 h14 v-30 h18 v22 h14 v-6 h16 v20 h18 v-12 h14 v8 h54 V135 H0 Z"],
  figure: ["M0 98 C50 90 100 94 150 86 C190 80 220 82 240 80 V135 H0 Z", "M0 116 H240 V135 H0 Z M166 116 l2-26 h-4 l1-11 c0-4 2-6 4-6 c2 0 4 2 4 6 l1 11 h-4 l2 26 z M169 69 a5 5 0 1 0 0.1 0 z"],
  pagoda: ["M0 96 L40 70 L70 86 L110 56 L150 84 L182 66 L240 88 V135 H0 Z", "M0 114 H240 V135 H0 Z M150 114 C150 106 156 104 158 98 C160 92 162 90 164 80 L165 66 L166 80 C168 90 170 92 172 98 C174 104 180 106 180 114 Z"],
};
/** Heroes, viewBox 0 0 1440 810 (focal point on the right). */
const HERO: Record<Kind, readonly [string, string]> = {
  peaks: ["M0 520 L220 400 L380 470 L600 330 L800 440 L1000 360 L1200 430 L1440 380 V810 H0 Z", "M0 650 C260 610 520 640 780 600 C1000 570 1220 590 1440 570 V810 H0 Z"],
  city: ["M0 540 L260 450 L440 500 L680 410 L900 470 L1120 420 L1440 470 V810 H0 Z", "M0 620 h80 v-60 h60 v34 h56 v-96 h76 v70 h56 v-36 h70 v60 h56 v-120 h90 v88 h56 v-28 h76 v66 h70 v-42 h60 v-80 h80 v100 h60 v-50 h70 v40 h80 v-70 h60 v50 h70 v-30 h144 V810 H0 Z"],
  figure: ["M0 560 C300 510 600 540 900 500 C1100 474 1300 486 1440 476 V810 H0 Z", "M0 680 H1440 V810 H0 Z M1000 680 l10-118 h-19 l5-48 c0-19 8-29 19-29 c11 0 19 10 19 29 l5 48 h-19 l10 118 z M1015 481 a22 22 0 1 0 0.1 0 z"],
  pagoda: ["M0 540 L240 450 L420 500 L660 400 L880 470 L1100 410 L1440 460 V810 H0 Z", "M0 660 H1440 V810 H0 Z M900 660 C900 610 940 596 954 560 C968 524 980 510 992 450 L1002 360 L1012 450 C1024 510 1036 524 1050 560 C1064 596 1104 610 1104 660 Z"],
};

/** FNV-1a — small, stable, good enough to spread titles over 21 scenes. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface ArtPalette {
  bg: string;
  glow: string;
  mid: string;
  dark: string;
  kind: Kind;
}

/** The palette a seed maps to — e.g. to tint a card's background behind a loading image. */
export function artPalette(seed: string): ArtPalette {
  const p = PALETTES[hash(seed || "myanflix") % PALETTES.length];
  return { bg: p[0], glow: p[1], mid: p[2], dark: p[3], kind: p[7] };
}

export function FallbackArt({
  seed,
  variant = "poster",
  className,
}: {
  /** Usually the title (or id). The same seed always draws the same scene. */
  seed: string;
  variant?: FallbackArtVariant;
  className?: string;
}) {
  const p = PALETTES[hash(seed || "myanflix") % PALETTES.length];
  const [bg, glow, mid, dark, mx, my, mr, kind] = p;
  const svgClass = cn("absolute inset-0 size-full", className);

  if (variant === "landscape") {
    const [back, front] = LAND[kind];
    return (
      <svg className={svgClass} viewBox="0 0 240 135" preserveAspectRatio="xMidYMid slice" aria-hidden focusable={false}>
        <rect width="240" height="135" fill={bg} />
        <circle cx={60 + mx * 1.6} cy="40" r="24" fill={glow} />
        <path d={back} fill={mid} />
        <path d={front} fill={dark} />
      </svg>
    );
  }

  if (variant === "hero") {
    const [back, front] = HERO[kind];
    const sx = 900 + mx * 3;
    return (
      <svg className={svgClass} viewBox="0 0 1440 810" preserveAspectRatio="xMidYMid slice" aria-hidden focusable={false}>
        <rect width="1440" height="810" fill={bg} />
        <circle cx={sx} cy="300" r="280" fill={glow} opacity="0.12" />
        <circle cx={sx} cy="300" r="128" fill={glow} />
        <path d={back} fill={mid} />
        <path d={front} fill={dark} />
      </svg>
    );
  }

  if (variant === "book") {
    return (
      <svg className={svgClass} viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice" aria-hidden focusable={false}>
        <rect width="100" height="140" fill={bg} />
        <circle cx={mx} cy="40" r="16" fill={glow} />
        <path d="M0 96 C25 88 50 92 75 84 C88 80 96 82 100 80 V140 H0 Z" fill={mid} />
        <path d="M0 116 C30 110 60 114 100 106 V140 H0 Z" fill={dark} />
        <rect width="5" height="140" fill="#08080B" opacity="0.35" />
      </svg>
    );
  }

  const [back, front] = ART[kind];
  return (
    <svg className={svgClass} viewBox="0 0 120 180" preserveAspectRatio="xMidYMid slice" aria-hidden focusable={false}>
      <rect width="120" height="180" fill={bg} />
      <circle cx={mx} cy={my} r={mr} fill={glow} />
      <path d={back} fill={mid} />
      <path d={front} fill={dark} />
      <rect y="118" width="120" height="62" fill="#08080B" opacity="0.35" />
    </svg>
  );
}
