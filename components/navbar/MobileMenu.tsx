"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Home, Layers, Search, Tv } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

export function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const links = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/movies", label: t.nav.movies, icon: Film },
    { href: "/series", label: t.nav.series, icon: Tv },
    { href: "/categories", label: t.nav.categories, icon: Layers },
    { href: "/search", label: t.nav.search, icon: Search },
  ];

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
          {links.map((link) => {
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
