"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { isActiveHref } from "./nav";

export interface TabBarItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** A destination…  */
  href?: string;
  /** …or an action (the overflow sheet). Exactly one of the two. */
  onClick?: () => void;
  badge?: number;
}

/**
 * THE MOBILE BOTTOM TAB BAR — the phone counterpart of the desktop rail.
 *
 * Thumb-reachable, safe-area aware (it pads itself past the home indicator),
 * and capped at five slots: four destinations plus the overflow sheet, which
 * carries everything else. Targets are 44px+ tall including the label.
 */
export function TabBar({ items, className }: { items: TabBarItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        // px-safe as well as pb-safe: in landscape the notch/rounded corner
        // eats the outermost tab, not just the home indicator.
        "fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-background/85 px-safe pb-safe backdrop-blur-xl lg:hidden",
        className,
      )}
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const active = item.href ? isActiveHref(pathname, item.href) : false;
          const Icon = item.icon;
          const content = (
            <>
              <span className="relative">
                <Icon className="size-5.5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary ring-2 ring-background"
                  />
                )}
              </span>
              <span className="max-w-full truncate text-[10px] font-medium">{item.label}</span>
            </>
          );
          const classes = cn(
            "flex h-full w-full flex-col items-center justify-center gap-1 px-1 py-2.5 transition-colors duration-150 ease-out outline-none",
            "focus-visible:bg-white/6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            active ? "text-primary" : "text-muted-foreground active:text-foreground",
          );

          return (
            <li key={item.key} className="min-w-0 flex-1">
              {item.href ? (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={classes}
                >
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={item.onClick} className={classes}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
