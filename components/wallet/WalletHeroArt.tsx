/**
 * The Wallet hero's picture (Wallet.dc.html): festival lanterns on a string
 * over a night city with a pagoda, in crimson and gold. Inline SVG, drawn
 * locally — never a remote image. Decorative (aria-hidden).
 */

/** The bulbs along the string: points on the board's curve M600 110 Q1020 230 1440 92. */
const BULBS = Array.from({ length: 41 }, (_, i) => {
  const t = i / 40;
  const x = (1 - t) * (1 - t) * 600 + 2 * (1 - t) * t * 1020 + t * t * 1440;
  const y = (1 - t) * (1 - t) * 110 + 2 * (1 - t) * t * 230 + t * t * 92;
  return { x: Math.round(x), y: Math.round(y) };
});

/** [x, string top, string bottom, lantern centre y, body colour] */
const LANTERNS: readonly [number, number, number, number, string][] = [
  [734, 142, 170, 186, "#F2A65A"],
  [869, 160, 208, 224, "#E8743A"],
  [1003, 166, 202, 218, "#F2A65A"],
  [1138, 158, 212, 228, "#E8743A"],
  [1272, 137, 167, 183, "#F2A65A"],
];

const SKYLINE =
  "M0 470 V390 H48 V368 H96 V400 H144 V342 H192 V376 H240 V360 H288 V394 H336 V326 H384 V382 H432 V354 H480 V372 H528 V338 H576 V390 H624 V364 H672 V310 H720 V378 H768 V346 H816 V384 H864 V358 H912 V332 H960 V370 H1008 V350 H1056 V386 H1104 V362 H1152 V340 H1200 V380 H1248 V356 H1296 V392 H1344 V366 H1392 V344 H1440 V540 H0 Z";
const PAGODA =
  "M1110 440 C1110 410 1136 402 1144 380 C1152 358 1160 350 1166 316 L1172 250 L1178 316 C1184 350 1192 358 1200 380 C1208 402 1234 410 1234 440 Z";
const GROUND = "M0 478 C300 456 620 470 900 452 C1120 438 1300 446 1440 440 V540 H0 Z";

export function WalletHeroArt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      viewBox="0 0 1440 540"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable={false}
    >
      <rect width="1440" height="540" fill="#170A0F" />
      <circle cx="1090" cy="190" r="430" className="fill-crimson" opacity="0.10" />
      <circle cx="1090" cy="190" r="210" className="fill-crimson" opacity="0.14" />
      <circle cx="180" cy="460" r="300" className="fill-gold" opacity="0.05" />
      <path d="M600 110 Q1020 230 1440 92" fill="none" className="stroke-gold" strokeOpacity="0.22" strokeWidth="1.5" />
      {BULBS.map((b) => (
        <circle key={b.x} cx={b.x} cy={b.y} r="2.5" className="fill-gold" opacity="0.55" />
      ))}
      {LANTERNS.map(([x, top, bottom, cy, body]) => (
        <g key={x}>
          <path d={`M${x} ${top} V${bottom}`} className="stroke-gold" strokeOpacity="0.35" strokeWidth="1.5" />
          <circle cx={x} cy={cy} r="34" fill="#F2A65A" opacity="0.10" />
          <rect x={x - 7} y={cy - 19} width="14" height="4" rx="1.5" fill="#7A3A12" />
          <ellipse cx={x} cy={cy} rx="12" ry="16" fill={body} />
          <path d={`M${x} ${cy - 15} V${cy + 15}`} stroke="#7A3A12" strokeOpacity="0.45" strokeWidth="1.2" />
          <rect x={x - 6} y={cy + 15} width="12" height="3" rx="1.5" fill="#7A3A12" />
        </g>
      ))}
      <path d={SKYLINE} fill="#2A1219" />
      <path d={PAGODA} fill="#2A1219" />
      <path d={GROUND} fill="#0B0508" />
    </svg>
  );
}
