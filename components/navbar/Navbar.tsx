"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, Menu } from "lucide-react";

import { MobileMenu } from "./MobileMenu";
import { AccountMenu } from "./AccountMenu";
import { Brand } from "@/components/shared/Brand";
import { TopBar } from "@/components/system/TopBar";
import { isActiveHref } from "@/components/system/nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { notificationService } from "@/services/api/notificationService";
import { cn } from "@/lib/utils";

/**
 * The standalone top bar for routes that opt out of the app shell — the player,
 * which deliberately has no rail and no tab bar so nothing competes with the
 * picture, but still keeps wallet, notifications and navigation one click away
 * while watching.
 *
 * Everywhere else, navigation comes from <AppShell> (rail + tab bar).
 */
export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t.nav.home },
    { href: "/movies", label: t.nav.media },
    ...(user ? [{ href: "/watchlist", label: t.nav.watchlist }] : []),
  ];

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: Boolean(user),
  });

  return (
    <>
      <TopBar
        left={
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon-lg"
              className="size-10 rounded-full lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t.nav.openNavigation}
            >
              <Menu className="size-5" />
            </Button>

            <div className="shrink-0">
              <Brand wordmarkClassName="hidden sm:inline" />
            </div>

            <nav className="hidden items-center gap-1 pl-3 lg:flex">
              {navLinks.map((link) => {
                const active = isActiveHref(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        }
        actions={
          user ? (
            <>
              <Button
                variant="ghost"
                size="icon-lg"
                className="relative size-10 rounded-full"
                render={<Link href="/notifications" />}
                nativeButton={false}
                aria-label={t.nav.notifications}
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-primary ring-2 ring-background" />
                )}
              </Button>
              <AccountMenu side="bottom" align="end" />
            </>
          ) : (
            <Button className="h-9 rounded-full px-4" render={<Link href="/login" />} nativeButton={false}>
              {t.nav.signIn}
            </Button>
          )
        }
      />

      <MobileMenu open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}
