"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/shared/Brand";
import { AccountMenu } from "@/components/navbar/AccountMenu";
import { BalancePill, NotificationsBell, SearchButton } from "@/components/navbar/TopBarActions";
import { LanguageSwitch } from "@/components/system/LanguageSwitch";
import { activeShellTab, SHELL_TAB_HREF, type ShellTab } from "@/components/system/nav";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";

/**
 * THE MARQUEE TOP BAR's header row (SHELL.md §2–3): 72px (60px on phones).
 * Wordmark · Home Media Wallet (the active tab is the crimson pill, desktop
 * only — phones get the dock) · search · bell · green balance pill · avatar
 * menu, which is the way to Profile. Signed out, the bell, balance and avatar
 * become one white "Sign in" button.
 *
 * The transparent/glass material lives on the sticky wrapper in AppShell.
 */
export function TopBarHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const s = useSection(shellText);
  const active = activeShellTab(pathname);

  const tabs: Array<{ key: ShellTab; label: string }> = [
    { key: "home", label: t.nav.home },
    { key: "media", label: t.nav.media },
    { key: "wallet", label: t.nav.wallet },
  ];

  return (
    <header className="flex h-[72px] items-center gap-[clamp(16px,2.5vw,40px)] px-gutter max-desk:h-[60px] max-desk:pr-2">
      <Brand />

      <nav aria-label={s.mainNav} className="flex items-center gap-1 max-desk:hidden">
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={SHELL_TAB_HREF[tab.key]}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-9 items-center rounded-full px-4 text-[15px] whitespace-nowrap outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
                on
                  ? "bg-crimson font-extrabold text-white hover:text-white"
                  : "font-bold text-fg-muted hover:bg-tonal-faint hover:text-fg",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <SearchButton />
        {user ? (
          <>
            <NotificationsBell />
            <BalancePill />
            <AccountMenu />
          </>
        ) : (
          <Link
            href="/login"
            className="mq-press ml-1.5 flex h-10 items-center rounded-[12px] bg-play px-[18px] text-[15px] font-extrabold whitespace-nowrap text-ink outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link max-desk:mr-2 max-desk:h-9 max-desk:px-3.5 max-desk:text-sm"
          >
            {s.signIn}
          </Link>
        )}
      </div>
    </header>
  );
}

/**
 * The minimal bar for the sign-in family (SHELL.md §3b): glass, the wordmark
 * and a quiet language switch. No nav, no dock.
 */
export function AuthTopBarHeader() {
  return (
    <header className="flex h-[72px] items-center justify-between gap-4 px-gutter max-desk:h-[60px]">
      <Brand />
      <LanguageSwitch />
    </header>
  );
}
