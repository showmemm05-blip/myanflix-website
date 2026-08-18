"use client";

import Image from "next/image";
import { Check, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MethodTileOption {
  type: string;
  label: string;
  logoUrl: string | null;
}

/** Small square method logo with a graceful placeholder when no logo is set. */
export function MethodLogo({
  logoUrl,
  size = 20,
  className,
}: {
  logoUrl: string | null | undefined;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/6 ring-1 ring-white/10 ring-inset",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt="" width={size} height={size} className="size-full object-cover" unoptimized />
      ) : (
        <ImageIcon className="text-muted-foreground" style={{ width: size * 0.5, height: size * 0.5 }} />
      )}
    </div>
  );
}

/**
 * The method picker — logo above label, one tile per payment method, mirroring
 * the mobile app so deposit and withdrawal read the same on both surfaces.
 *
 * Selection is stated twice on purpose (violet ring + a check disc in the
 * corner) because on a small tile a ring alone is easy to miss, and picking the
 * wrong account here means money going to the wrong place.
 */
export function MethodTileGrid({
  methods,
  selected,
  onSelect,
}: {
  methods: MethodTileOption[];
  selected: string | null;
  onSelect: (type: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {methods.map((m) => {
        const isActive = selected === m.type;
        return (
          <button
            key={m.type}
            type="button"
            onClick={() => onSelect(m.type)}
            aria-pressed={isActive}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-2xl py-3.5 ring-1 ring-inset transition-[background-color,box-shadow,transform] duration-200 ease-out outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
              isActive
                ? "bg-primary/12 ring-primary/60"
                : "bg-white/[0.04] ring-white/10 hover:bg-white/8 hover:ring-white/20",
            )}
          >
            {isActive && (
              <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-2.5" />
              </span>
            )}
            <MethodLogo logoUrl={m.logoUrl} size={28} className="rounded-lg" />
            <span
              className={cn(
                "line-clamp-1 px-1 text-center text-xs font-semibold",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
