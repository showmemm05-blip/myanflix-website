"use client";

import type { NetworkQuality } from "@/lib/hooks/use-network-quality";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { cn } from "@/lib/utils";
import { WifiIcon, WifiLowIcon, WifiOffIcon, type PlayerIconProps } from "./player-icons";

const ICONS: Record<NetworkQuality, (p: PlayerIconProps) => React.ReactElement> = {
  good: WifiIcon,
  slow: WifiLowIcon,
  offline: WifiOffIcon,
};

const COLORS: Record<NetworkQuality, string> = {
  good: "text-money",
  slow: "text-pending",
  offline: "text-danger",
};

/**
 * Icon-only connection disc (Player.dc.html: 36px, glass, green Wi-Fi) — no
 * text/toast/modal per spec. Colour and glyph both change with quality so it
 * reads at a glance. Placed by the player: in the top row while the controls
 * show, alone at the top right once they fade.
 */
export function NetworkStatusIcon({
  quality,
  className,
  silent = false,
}: {
  quality: NetworkQuality;
  className?: string;
  /** Hide from screen readers (a faded-out copy while another one speaks). */
  silent?: boolean;
}) {
  const p = useSection(playText);
  const Icon = ICONS[quality];
  const label = quality === "good" ? p.networkGood : quality === "slow" ? p.networkSlow : p.networkOffline;
  return (
    <span
      role={silent ? undefined : "img"}
      aria-label={silent ? undefined : label}
      aria-hidden={silent || undefined}
      className={cn(
        "pointer-events-none flex size-9 shrink-0 items-center justify-center rounded-full bg-glass backdrop-blur-[14px] transition-colors duration-300 ease-out",
        COLORS[quality],
        className,
      )}
    >
      <Icon size={18} />
    </span>
  );
}
