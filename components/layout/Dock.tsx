"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HomeIcon, MediaIcon, WalletIcon, type IconProps } from "@/components/system/icons";
import { activeShellTab, SHELL_TAB_HREF, type ShellTab } from "@/components/system/nav";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";

/**
 * THE PHONE DOCK (SHELL.md §6) — the app's floating tab bar, under 720px
 * only. 64px tall, 16px from the sides, 20px off the bottom (plus the home
 * indicator), radius 32, the --mq-dock fill + blur(20px). The active tab
 * grows into the crimson pill with its label; the others are 44px icon
 * links with spoken names. Same three tabs and same active rule as the top
 * bar. `justify-evenly`, not `justify-between`: with three tabs, between
 * pinned Home and Wallet to the capsule's ends and left two wide holes in the
 * middle; evenly shares the free room as equal gaps, like the mobile app.
 */
export function Dock() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const s = useSection(shellText);
  const active = activeShellTab(pathname);

  const tabs: Array<{ key: ShellTab; label: string; Icon: (p: IconProps) => React.ReactElement }> = [
    { key: "home", label: t.nav.home, Icon: HomeIcon },
    { key: "media", label: t.nav.media, Icon: MediaIcon },
    { key: "wallet", label: t.nav.wallet, Icon: WalletIcon },
  ];

  return (
    <nav
      aria-label={s.mainNav}
      className="fixed right-4 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] left-4 z-[60] flex h-16 items-center justify-evenly rounded-[32px] bg-(--mq-dock) px-2.5 shadow-dock backdrop-blur-[20px] desk:hidden"
    >
      {tabs.map(({ key, label, Icon }) => {
        const on = key === active;
        return (
          <Link
            key={key}
            href={SHELL_TAB_HREF[key]}
            aria-current={on ? "page" : undefined}
            aria-label={on ? undefined : label}
            className={cn(
              "flex h-11 items-center rounded-[22px] outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
              on
                ? "gap-2 bg-crimson pr-[18px] pl-3.5 text-white hover:text-white"
                : "w-11 justify-center text-fg-faint hover:text-fg",
            )}
          >
            <Icon size={22} />
            {on && <span className="text-sm leading-[18px] font-extrabold whitespace-nowrap">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
