"use client";

import type { ComponentType } from "react";

export interface HudMessage {
  /** Bumped on every trigger — used as the React key so repeating the same action restarts the animation. */
  id: number;
  icon: ComponentType<{ size?: number; className?: string }>;
  label?: string;
  /** 0–100. Draws a meter under the glyph, for volume-style continuous changes. */
  meter?: number;
}

/**
 * Confirms a keyboard or gesture action in the middle of the picture and gets out
 * of the way (Player.dc.html "volume pop-up": a frosted 24px-radius slab, 32px
 * glyph, label, white meter). Without it, pressing a shortcut on a paused or
 * quiet passage gives no sign it registered, and users press it again.
 */
export function PlayerHud({ message }: { message: HudMessage | null }) {
  if (!message) return null;
  const { id, icon: Icon, label, meter } = message;

  return (
    <div role="status" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div
        key={id}
        className="animate-hud-pop flex min-w-32 flex-col items-center gap-2.5 rounded-[24px] bg-[rgba(8,8,11,0.55)] px-6 py-5 text-fg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-[24px]"
      >
        <Icon size={32} />
        {label && <span className="text-sm leading-[18px] font-bold tabular-nums">{label}</span>}
        {meter != null && (
          <span aria-hidden className="relative h-1 w-20 overflow-hidden rounded-[2px] bg-white/25">
            <span
              className="absolute inset-y-0 left-0 rounded-[2px] bg-play transition-[width] duration-150 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, meter))}%` }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
