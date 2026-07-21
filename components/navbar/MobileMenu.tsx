"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Heart, Home, Layers, LibraryBig, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/categories", label: "Categories", icon: Layers },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "My Library", icon: LibraryBig },
  { href: "/watchlist", label: "Watchlist", icon: Heart },
];

export function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 border-white/[0.08] bg-background p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-16 items-center gap-2 border-b border-white/[0.08] px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Film className="size-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">MyanFlix</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <link.icon className="size-4.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
