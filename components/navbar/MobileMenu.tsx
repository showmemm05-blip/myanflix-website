"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bookmark,
  Clapperboard,
  History,
  Home,
  LogOut,
  Receipt,
  Search,
  Settings,
  User,
  Wallet,
} from "lucide-react";

import { Brand } from "@/components/shared/Brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { chipClass } from "@/components/system/Chip";
import { isActiveHref } from "@/components/system/nav";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

type MenuLink = { href: string; label: string; icon: LucideIcon };

/**
 * THE OVERFLOW SHEET behind the tab bar's "More" slot.
 *
 * The bottom tab bar can only hold the handful of destinations a thumb reaches
 * for constantly; everything else in the product lives here, one tap away —
 * account pages, finance, preferences, the language switcher and sign-out. It
 * is the mobile mirror of the desktop rail's account menu, so no destination
 * is reachable on one form factor and lost on the other.
 */
export function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  // Movies, Series and Categories were all folded into the one /movies page
  // (its own tab strip), so browsing needs a single "Media" entry.
  const mainLinks: MenuLink[] = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/movies", label: t.nav.media, icon: Clapperboard },
    { href: "/search", label: t.nav.search, icon: Search },
  ];

  const accountLinks: MenuLink[] = [
    { href: "/watchlist", label: t.nav.watchlist, icon: Bookmark },
    { href: "/wallet", label: t.nav.wallet, icon: Wallet },
    { href: "/transactions", label: t.transactions.title, icon: Receipt },
    { href: "/notifications", label: t.nav.notifications, icon: Bell },
    { href: "/watch-history", label: t.watchHistory.title, icon: History },
    { href: "/profile", label: t.nav.profile, icon: User },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  const renderLink = (link: MenuLink) => {
    const active = isActiveHref(pathname, link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => onOpenChange(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
          active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-white/6 hover:text-foreground",
        )}
      >
        <link.icon className="size-4.5" />
        {link.label}
      </Link>
    );
  };

  const sectionLabel = "px-3.5 pt-4 pb-1 text-kicker";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[86%] max-w-sm flex-col gap-0 border-white/[0.08] bg-background p-0"
      >
        <SheetTitle className="sr-only">{t.nav.openNavigation}</SheetTitle>

        <div className="relative flex h-16 shrink-0 items-center overflow-hidden border-b border-white/[0.06] px-5">
          <div aria-hidden className="aurora-wash-soft pointer-events-none absolute inset-0 opacity-50 blur-2xl" />
          <span className="relative">
            <Brand href={null} />
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 pb-safe scrollbar-thin">
          <nav className="flex flex-col gap-1">{mainLinks.map(renderLink)}</nav>

          {user && (
            <>
              <p className={sectionLabel}>{t.footer.account}</p>
              <nav className="flex flex-col gap-1">{accountLinks.map(renderLink)}</nav>
            </>
          )}

          {/* Language options stay in their own script on purpose — you find
              your language by recognising it, not by having it translated. */}
          <p className={sectionLabel}>{t.language.switcherLabel}</p>
          <div className="flex gap-2 px-3.5 pt-1">
            <button
              type="button"
              onClick={() => setLanguage("mm")}
              aria-pressed={language === "mm"}
              className={chipClass({ tone: "mono", size: "lg", selected: language === "mm", variant: "outline" })}
            >
              မြန်မာ
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
              className={chipClass({ tone: "mono", size: "lg", selected: language === "en", variant: "outline" })}
            >
              English
            </button>
          </div>

          <div className="mt-4 border-t border-white/[0.06] p-1 pt-4">
            {user ? (
              <Button
                variant="ghost"
                className="h-11 w-full justify-start gap-3 rounded-xl px-3.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  onOpenChange(false);
                  logout();
                }}
              >
                <LogOut className="size-4.5" />
                {t.nav.logOut}
              </Button>
            ) : (
              <Button
                className="h-11 w-full rounded-full active:scale-[0.98]"
                render={<Link href="/login" onClick={() => onOpenChange(false)} />}
                nativeButton={false}
              >
                {t.nav.signIn}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
