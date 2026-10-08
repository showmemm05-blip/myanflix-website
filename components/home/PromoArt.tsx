"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import type { PromoArtPreset } from "./showcase-model";

/**
 * PROMO ART (HomeWeb.dc.html, the hero's promo slides): flat SVG scenes on
 * the board's 1440 × 810 canvas — no remote placeholders, no picsum.
 *
 *   PREMIUM  gold crown on a warm night        (the Premium slide)
 *   PAYMENT  stacked green / gold wallet cards (the Pay-the-Myanmar-way slide)
 *   GAMES    crimson controller, four buttons  (the Games slide)
 *   GENERIC  a crimson screen with a play mark (any other promo)
 *
 * `variant="card"` frames the same drawing for the 16:10 coming-soon cards
 * (the art sits right of centre, so the card view zooms in on it).
 * Decoration only — always aria-hidden.
 */
const GOLD = "#F5C451";
const GREEN = "#2FD07E";
const CRIMSON = "#E0181F";

type Dot = { cx: number; cy: number; r: number; fill: string; op: number };
type Shape = { d: string; fill: string; op: number };
type Scene = { bg: string; glow: string; sx: number; sy: number; sr: number; dots: Dot[]; shapes: Shape[]; extra?: "games" };

const SCENES: Record<PromoArtPreset, Scene> = {
  PREMIUM: {
    bg: "#1A1408",
    glow: GOLD,
    sx: 1040,
    sy: 330,
    sr: 110,
    dots: [
      { cx: 760, cy: 180, r: 5, fill: GOLD, op: 0.8 },
      { cx: 1290, cy: 150, r: 4, fill: GOLD, op: 0.7 },
      { cx: 1330, cy: 420, r: 6, fill: GOLD, op: 0.5 },
      { cx: 820, cy: 420, r: 3, fill: GOLD, op: 0.7 },
    ],
    shapes: [
      { d: "M0 620 C260 600 520 630 780 590 C1000 560 1220 580 1440 570 V810 H0 Z", fill: "#2A2010", op: 1 },
      { d: "M840 490 H1240 L1272 260 L1140 352 L1040 190 L940 352 L808 260 Z", fill: GOLD, op: 0.95 },
      { d: "M840 490 H1240 V530 H840 Z", fill: "#B8860B", op: 1 },
      { d: "M0 700 H1440 V810 H0 Z", fill: "#0E0B05", op: 1 },
    ],
  },
  PAYMENT: {
    bg: "#0B1F17",
    glow: GREEN,
    sx: 1060,
    sy: 300,
    sr: 100,
    dots: [
      { cx: 1300, cy: 520, r: 26, fill: GOLD, op: 0.9 },
      { cx: 1340, cy: 560, r: 26, fill: GOLD, op: 0.7 },
      { cx: 760, cy: 560, r: 22, fill: GREEN, op: 0.6 },
    ],
    shapes: [
      { d: "M0 640 C300 610 600 640 900 600 C1100 574 1300 586 1440 576 V810 H0 Z", fill: "#0E2A20", op: 1 },
      {
        d: "M880 400 h300 a24 24 0 0 1 24 24 v180 a24 24 0 0 1 -24 24 h-300 a24 24 0 0 1 -24 -24 v-180 a24 24 0 0 1 24 -24 z",
        fill: "#1D4A3A",
        op: 1,
      },
      {
        d: "M920 360 h300 a24 24 0 0 1 24 24 v180 a24 24 0 0 1 -24 24 h-300 a24 24 0 0 1 -24 -24 v-180 a24 24 0 0 1 24 -24 z",
        fill: GREEN,
        op: 0.9,
      },
      {
        d: "M960 320 h300 a24 24 0 0 1 24 24 v180 a24 24 0 0 1 -24 24 h-300 a24 24 0 0 1 -24 -24 v-180 a24 24 0 0 1 24 -24 z",
        fill: GOLD,
        op: 0.95,
      },
      { d: "M960 372 h348 v40 h-348 z", fill: "#1F1600", op: 0.35 },
      { d: "M0 720 H1440 V810 H0 Z", fill: "#061511", op: 1 },
    ],
  },
  GAMES: {
    bg: "#180A0D",
    glow: CRIMSON,
    sx: 1040,
    sy: 330,
    sr: 120,
    dots: [
      { cx: 1120, cy: 390, r: 14, fill: GREEN, op: 1 },
      { cx: 1160, cy: 430, r: 14, fill: GOLD, op: 1 },
      { cx: 1080, cy: 430, r: 14, fill: "#FF4D55", op: 1 },
      { cx: 1120, cy: 470, r: 14, fill: "#4DB3FF", op: 1 },
    ],
    shapes: [
      { d: "M0 660 H1440 V810 H0 Z", fill: "#0B0507", op: 1 },
      {
        d: "M846 520 L892 316 Q910 268 962 268 H1118 Q1170 268 1188 316 L1234 520 Q1244 590 1188 590 Q1134 590 1098 520 L1064 462 H1016 L982 520 Q946 590 892 590 Q836 590 846 520 Z",
        fill: CRIMSON,
        op: 0.55,
      },
      {
        d: "M860 510 L900 330 Q916 290 960 290 H1120 Q1164 290 1180 330 L1220 510 Q1228 570 1180 570 Q1132 570 1100 510 L1070 460 H1010 L980 510 Q948 570 900 570 Q852 570 860 510 Z",
        fill: "#2B1116",
        op: 1,
      },
      { d: "M950 380 h24 v34 h34 v24 h-34 v34 h-24 v-34 h-34 v-24 h34 z", fill: GOLD, op: 1 },
    ],
    // The buttons sit ON the controller, so they are drawn after it.
    extra: "games",
  },
  GENERIC: {
    bg: "#16101A",
    glow: CRIMSON,
    sx: 1040,
    sy: 320,
    sr: 104,
    dots: [
      { cx: 780, cy: 200, r: 4, fill: "#FF4D55", op: 0.7 },
      { cx: 1310, cy: 170, r: 5, fill: GOLD, op: 0.6 },
      { cx: 1340, cy: 470, r: 4, fill: "#FF4D55", op: 0.5 },
    ],
    shapes: [
      { d: "M0 630 C280 600 560 636 840 596 C1060 566 1260 584 1440 574 V810 H0 Z", fill: "#221826", op: 1 },
      {
        d: "M868 300 h344 a24 24 0 0 1 24 24 v204 a24 24 0 0 1 -24 24 h-344 a24 24 0 0 1 -24 -24 v-204 a24 24 0 0 1 24 -24 z",
        fill: "#2B1A22",
        op: 1,
      },
      { d: "M1004 366 v120 l104 -60 z", fill: CRIMSON, op: 0.95 },
      { d: "M960 576 h160 v16 h-160 z", fill: "#2B1A22", op: 1 },
      { d: "M0 710 H1440 V810 H0 Z", fill: "#0C080E", op: 1 },
    ],
  },
};

/** The board's scene for a preset, filling its positioned parent. */
export function PromoScene({
  preset,
  variant = "hero",
  className,
}: {
  preset: PromoArtPreset;
  variant?: "hero" | "card";
  className?: string;
}) {
  const scene = SCENES[preset] ?? SCENES.GENERIC;
  return (
    <svg
      aria-hidden
      focusable={false}
      width="100%"
      height="100%"
      viewBox={variant === "card" ? "680 150 760 475" : "0 0 1440 810"}
      preserveAspectRatio="xMidYMid slice"
      className={cn("absolute inset-0 size-full", className)}
    >
      <rect x="0" y="0" width="1440" height="810" fill={scene.bg} />
      <circle cx={scene.sx} cy={scene.sy} r={280} fill={scene.glow} opacity={0.12} />
      <circle cx={scene.sx} cy={scene.sy} r={scene.sr} fill={scene.glow} />
      {scene.extra !== "games" &&
        scene.dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} opacity={d.op} />)}
      {scene.shapes.map((s, i) => (
        <path key={i} d={s.d} fill={s.fill} opacity={s.op} />
      ))}
      {scene.extra === "games" &&
        scene.dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} opacity={d.op} />)}
    </svg>
  );
}

/**
 * A promo's picture: the admin's uploaded image when there is one (and it
 * loads), otherwise the preset scene.
 */
export function PromoVisual({
  preset,
  imageUrl,
  variant = "hero",
  sizes,
  priority = false,
  className,
}: {
  preset: PromoArtPreset;
  imageUrl: string | null;
  variant?: "hero" | "card";
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (imageUrl && failedSrc !== imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setFailedSrc(imageUrl)}
        className={cn("object-cover object-[70%_center]", className)}
        style={{ backgroundColor: (SCENES[preset] ?? SCENES.GENERIC).bg }}
      />
    );
  }
  return <PromoScene preset={preset} variant={variant} className={className} />;
}
