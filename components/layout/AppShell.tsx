"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, Bookmark, Clapperboard, Home, LogIn, Menu, Search, Wallet } from "lucide-react";

import { Brand } from "@/components/shared/Brand";
import { Footer } from "@/components/footer/Footer";
import { MobileMenu } from "@/components/navbar/MobileMenu";
import { AccountMenu } from "@/components/navbar/AccountMenu";
import { WalletBalance, WalletBalanceTile } from "@/components/navbar/WalletBalance";
import { SideRail } from "@/components/system/SideRail";
import { TabBar, type TabBarItem } from "@/components/system/TabBar";
import { TopBar } from "@/components/system/TopBar";
import type { NavDestination } from "@/components/system/nav";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { notificationService } from "@/services/api/notificationService";

/**
 * THE APP SHELL of Aurora Theater.
 *
 * Desktop (lg+): a persistent 72px icon rail on the left carries navigation
 * and the account menu, and the content column gets a slim context bar — so
 * the top of the screen belongs to artwork, not to a menu.
 * Mobile: a safe-area-aware bottom tab bar carries the four destinations a
 * thumb wants, a compact top bar carries brand + live wallet + notifications,
 * and the "More" sheet carries everything else.
 *
 * Nothing that existed before became unreachable: watchlist, wallet,
 * transactions, notifications, watch history, profile, settings, the language
 * switcher and sign-out all live in the rail's account menu on desktop and in
 * the overflow sheet on mobile; the footer still links browse/account/support.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);

  // Same query key and service call the old navbar used — the notification
  // badge keeps reading exactly the same cache entry.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: Boolean(user),
  });

  // Watchlist and wallet only exist for signed-in users, so they only appear
  // for them — same gating as before.
  const railItems: NavDestination[] = [
    { key: "home", href: "/", label: t.nav.home, icon: Home },
    { key: "media", href: "/movies", label: t.nav.media, icon: Clapperboard },
    { key: "search", href: "/search", label: t.nav.search, icon: Search },
    ...(user
      ? [
          { key: "watchlist", href: "/watchlist", label: t.nav.watchlist, icon: Bookmark },
          { key: "wallet", href: "/wallet", label: t.nav.wallet, icon: Wallet },
        ]
      : []),
  ];

  const tabItems: TabBarItem[] = [
    { key: "home", href: "/", label: t.nav.home, icon: Home },
    { key: "media", href: "/movies", label: t.nav.media, icon: Clapperboard },
    { key: "search", href: "/search", label: t.nav.search, icon: Search },
    user
      ? { key: "watchlist", href: "/watchlist", label: t.nav.watchlist, icon: Bookmark }
      : { key: "signin", href: "/login", label: t.nav.signIn, icon: LogIn },
    { key: "more", label: t.nav.more, icon: Menu, onClick: () => setMoreOpen(true) },
  ];

  const notificationsButton = user ? (
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
  ) : null;

  return (
    <div className="min-h-screen">
      <SideRail
        brand={<Brand href="/" wordmarkClassName="sr-only" />}
        items={railItems}
        footer={
          user ? (
            <>
              {/* The balance lives with your account, in the corner, on the
                  same column as the wallet it opens — not on the content bar. */}
              <WalletBalanceTile />
              {notificationsButton}
              <AccountMenu side="right" align="end" />
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/login"
                    aria-label={t.nav.signIn}
                    className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary transition-colors duration-200 ease-out outline-none hover:bg-primary/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                }
              >
                <LogIn className="size-5" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {t.nav.signIn}
              </TooltipContent>
            </Tooltip>
          )
        }
      />

      <div className="flex min-h-screen flex-col pb-tabbar lg:pl-[72px] lg:pb-0">
        {/* Mobile-only: from lg up the rail carries the brand, navigation,
            notifications, the account menu and the balance, which would leave
            this bar an empty 56px band above every page. */}
        <TopBar
          className="lg:hidden"
          left={
            <div className="shrink-0 lg:hidden">
              <Brand wordmarkClassName="hidden sm:inline" />
            </div>
          }
          title={pageTitle(pathname, t)}
          actions={
            user ? (
              <>
                {/* Phones have no rail — there the account corner IS the top
                    bar, so the balance sits beside the avatar instead. */}
                <WalletBalance />
                {/* Notifications and the account menu live on the rail from lg
                    up — repeating them here would give the same destination two
                    buttons on one screen. */}
                <span className="lg:hidden">{notificationsButton}</span>
                <span className="lg:hidden">
                  <AccountMenu side="bottom" align="end" />
                </span>
              </>
            ) : (
              <Button
                className="h-9 rounded-full px-4"
                render={<Link href="/login" />}
                nativeButton={false}
              >
                {t.nav.signIn}
              </Button>
            )
          }
        />

        <main className="flex-1">{children}</main>

        <Footer />
      </div>

      <TabBar items={tabItems} />

      <MobileMenu open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  );
}

/**
 * The context bar's answer to "where am I?". Only the destinations that read
 * as their own place get a title — detail pages carry their own hero title,
 * and repeating it in the bar would be noise.
 */
function pageTitle(pathname: string, t: ReturnType<typeof useLanguage>["t"]): string | undefined {
  const titles: Record<string, string> = {
    "/": t.nav.home,
    "/movies": t.nav.media,
    "/series": t.nav.series,
    "/search": t.nav.search,
    "/watchlist": t.watchlist.title,
    "/watch-history": t.watchHistory.title,
    "/wallet": t.wallet.title,
    "/transactions": t.transactions.title,
    "/notifications": t.notifications.title,
    "/profile": t.profile.title,
    "/settings": t.settings.title,
  };
  return titles[pathname];
}
