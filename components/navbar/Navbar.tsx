"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, Film, Heart, LibraryBig, LogOut, Menu, Settings, User, Wallet } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { LanguageToggle } from "./LanguageToggle";
import { SearchBar } from "@/components/search/SearchBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { notificationService } from "@/services/api/notificationService";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t.nav.home },
    { href: "/movies", label: t.nav.movies },
    { href: "/categories", label: t.nav.categories },
    { href: "/library", label: t.nav.myLibrary },
    { href: "/watchlist", label: t.nav.watchlist },
  ];

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationService.getUnreadCount(),
  });

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t.nav.openNavigation}
          >
            <Menu className="size-5" />
          </Button>

          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Film className="size-4" />
            </div>
            <span className="hidden text-lg font-bold tracking-tight sm:inline">MyanFlix</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <SearchBar className="hidden w-64 md:block" />
            <LanguageToggle className="hidden sm:flex" />

            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  render={<Link href="/notifications" />}
                  nativeButton={false}
                  aria-label={t.nav.notifications}
                >
                  <Bell className="size-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-primary" />
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button className="rounded-full ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    }
                  >
                    <Avatar className="size-8 border border-white/10">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem render={<Link href="/profile" />}>
                        <User className="size-4" />
                        {t.nav.profile}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/library" />}>
                        <LibraryBig className="size-4" />
                        {t.nav.myLibrary}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/watchlist" />}>
                        <Heart className="size-4" />
                        {t.nav.watchlist}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/wallet" />}>
                        <Wallet className="size-4" />
                        {t.nav.wallet}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/settings" />}>
                        <Settings className="size-4" />
                        {t.nav.settings}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={logout}>
                        <LogOut className="size-4" />
                        {t.nav.logOut}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button render={<Link href="/login" />} nativeButton={false}>
                {t.nav.signIn}
              </Button>
            )}
          </div>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}
