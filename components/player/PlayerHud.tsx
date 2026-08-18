"use client";

import type { LucideIcon } from "lucide-react";

export interface HudMessage {
  /** Bumped on every trigger — used as the React key so repeating the same action restarts the animation. */
  id: number;
  icon: LucideIcon;
  label?: string;
  /** 0–100. Draws a meter under the glyph, for volume-style continuous changes. */
  meter?: number;
}

/**
 * Confirms a keyboard or gesture action in the middle of the picture and gets out
 * of the way. Without it, pressing a shortcut on a paused or quiet passage gives no
 * sign it registered, and users press it again.
 */
export function PlayerHud({ message }: { message: HudMessage | null }) {
  if (!message) return null;
  const { id, icon: Icon, label, meter } = message;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div
        key={id}
        className="animate-hud-pop flex min-w-24 flex-col items-center gap-2 rounded-3xl bg-black/45 px-6 py-5 text-white shadow-e3 ring-1 ring-white/12 backdrop-blur-xl ring-inset"
      >
        <Icon className="size-8" />
        {label && <span className="text-sm font-semibold tabular-nums">{label}</span>}
        {meter != null && (
          <div className="h-1 w-20 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-150 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, meter))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
