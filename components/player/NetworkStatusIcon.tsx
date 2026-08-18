import { WifiHigh, WifiLow, WifiOff, type LucideIcon } from "lucide-react";
import type { NetworkQuality } from "@/lib/hooks/use-network-quality";

const ICONS: Record<NetworkQuality, LucideIcon> = {
  good: WifiHigh,
  slow: WifiLow,
  offline: WifiOff,
};

const COLORS: Record<NetworkQuality, string> = {
  good: "text-success",
  slow: "text-warning",
  offline: "text-destructive",
};

const LABELS: Record<NetworkQuality, string> = {
  good: "Good connection",
  slow: "Slow connection",
  offline: "No internet connection",
};

/**
 * Icon-only, top-right of the player — no text/toast/modal per spec. Color
 * and glyph both change with quality so it reads at a glance like Netflix/
 * YouTube's own connection indicators.
 */
export function NetworkStatusIcon({ quality }: { quality: NetworkQuality }) {
  const Icon = ICONS[quality];
  return (
    <div
      role="img"
      aria-label={LABELS[quality]}
      className={`pointer-events-none absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/40 ring-1 ring-white/12 backdrop-blur-xl transition-colors duration-300 ease-out ring-inset ${COLORS[quality]}`}
    >
      <Icon className="size-4" />
    </div>
  );
}
