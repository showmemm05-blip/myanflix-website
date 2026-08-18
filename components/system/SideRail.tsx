"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isActiveHref, type NavDestination } from "./nav";

/**
 * THE PERSISTENT LEFT RAIL (lg and up) — the distinctive move of Aurora
 * Theater versus every top-navbar streaming site: navigation lives on the
 * edge, permanently, so the entire top of the screen belongs to the artwork.
 *
 * 72px of quiet glass: logo at the top, primary destinations as icons with
 * tooltips in the middle, account/wallet in the footer slot. The active item
 * is marked by a violet pill plus a small bar on the rail's edge, which reads
 * at a glance without needing a label.
 */
export function SideRail({
  brand,
  items,
  footer,
  className,
}: {
  brand?: ReactNode;
  items: NavDestination[];
  footer?: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center border-r border-white/[0.06] bg-background/80 backdrop-blur-xl lg:flex",
        className,
      )}
    >
      {/* A whisper of aurora at the top of the rail — the ambient signature,
          on chrome, where it can never sit behind body text. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
        <div className="aurora-wash-soft absolute inset-0 opacity-40 blur-2xl" />
      </div>

      {brand && <div className="relative flex h-16 shrink-0 items-center justify-center">{brand}</div>}

      <nav className="relative flex flex-1 flex-col items-center gap-1.5 overflow-y-auto py-3 scrollbar-none">
        {items.map((item) => (
          <RailLink key={item.key} item={item} active={isActiveHref(pathname, item.href)} />
        ))}
      </nav>

      {footer && (
        <div className="relative flex shrink-0 flex-col items-center gap-2 border-t border-white/[0.06] py-3">
          {footer}
        </div>
      )}
    </aside>
  );
}

function RailLink({ item, active }: { item: NavDestination; active: boolean }) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex size-11 items-center justify-center rounded-2xl transition-[background-color,color,transform] duration-200 ease-out outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-white/6 hover:text-foreground active:scale-95",
            )}
          />
        }
      >
        <Icon className="size-5" />
        {active && (
          <span
            aria-hidden
            className="absolute top-1/2 -left-3 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary"
          />
        )}
        {item.badge !== undefined && item.badge > 0 && (
          <span
            aria-hidden
            className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-background"
          />
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}
