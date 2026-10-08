"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { filterChipClass } from "@/components/system";
import {
  BellIcon,
  BookmarkIcon,
  HistoryIcon,
  ProfileIcon,
  ReceiptIcon,
  SettingsIcon,
  SignOutIcon,
} from "@/components/system/icons";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { libraryText } from "@/lib/i18n/sections/library";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/api/notificationService";

/**
 * THE ACCOUNT-PAGE FAMILY — two shells for the account pages (reached from
 * the avatar menu and the Profile page; they light no nav tab).
 *
 * - <LibraryHeader>  My List (/watchlist) and Watch history (/watch-history):
 *   the page H1 and the two-pill "Library sections" strip (Library board).
 * - <AccountLayout>  Profile, Notifications, Settings: a centred 1120px
 *   column with the sticky "Account" side menu (Profile · Notifications with
 *   its unread count · Settings (+ section links) · Transactions · Sign out).
 *   Under 720px the menu becomes a row of chips, the current page in white.
 */

// ── Library header ──────────────────────────────────────────────────────

/**
 * The Library pages' heading: H1 + subtitle (+ an optional line on the right,
 * e.g. "24 titles · newest first"), then the My List · Watch history strip.
 */
export function LibraryHeader({
  current,
  title,
  subtitle,
  aside,
}: {
  current: "list" | "history";
  title: ReactNode;
  subtitle: ReactNode;
  aside?: ReactNode;
}) {
  const shell = useSection(shellText);
  const lib = useSection(libraryText);
  const tabs = [
    { key: "list" as const, href: "/watchlist", label: shell.myList, Icon: BookmarkIcon },
    { key: "history" as const, href: "/watch-history", label: lib.watchHistory, Icon: HistoryIcon },
  ];

  return (
    <div className="px-gutter pt-10">
      <div className="flex items-end justify-between gap-x-6 gap-y-3 max-desk:flex-col max-desk:items-start">
        <div className="min-w-0">
          <h1 className="text-title text-fg">{title}</h1>
          <p className="mt-1.5 text-base leading-6 text-fg-muted">{subtitle}</p>
        </div>
        {aside && <div className="shrink-0 text-sm leading-5 text-fg-faint tabular-nums">{aside}</div>}
      </div>
      <nav
        aria-label={lib.librarySections}
        className="mq-rail -mx-gutter mt-5 flex gap-2 overflow-x-auto px-gutter"
      >
        {tabs.map(({ key, href, label, Icon }) => {
          const selected = key === current;
          return (
            <Link
              key={key}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={cn(filterChipClass({ selected }), "mq-snap shrink-0 gap-2")}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ── Account layout (side menu) ──────────────────────────────────────────

export type AccountPage = "profile" | "notifications" | "settings";

/** The Settings page's in-page section links (desktop side menu only). */
export const SETTINGS_SECTION_IDS = {
  profile: "s-profile",
  password: "s-password",
  code: "s-code",
  notifications: "s-notifications",
  language: "s-language",
  help: "s-help",
  delete: "s-delete",
} as const;

const sideItemClass = cn(
  "flex h-11 items-center gap-3 rounded-[12px] px-3.5 text-[15px] font-semibold text-fg-muted outline-none transition-colors duration-150",
  "hover:bg-tonal-ghost hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
  // Phone: a chip row (no icons), the current page in white.
  "max-desk:h-9 max-desk:shrink-0 max-desk:rounded-full max-desk:bg-raised max-desk:px-4 max-desk:text-sm max-desk:text-fg max-desk:[&>svg]:hidden",
);
const sideCurrentClass = cn(
  "bg-raised font-extrabold text-fg shadow-[inset_3px_0_0_var(--mq-crimson)] hover:bg-raised",
  "max-desk:bg-play max-desk:text-ink max-desk:shadow-none max-desk:hover:bg-play max-desk:hover:text-ink",
);

export function AccountLayout({ current, children }: { current: AccountPage; children: ReactNode }) {
  const { t } = useLanguage();
  const shell = useSection(shellText);
  const lib = useSection(libraryText);
  const { user, logout } = useAuth();
  const router = useRouter();

  // Same query (key and call) as the top-bar bell, so the two never disagree
  // and the notifications page's invalidation refreshes both.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: Boolean(user),
  });

  const items: { key: AccountPage | "transactions"; href: string; label: string; Icon: typeof ProfileIcon }[] = [
    { key: "profile", href: "/profile", label: t.profile.title, Icon: ProfileIcon },
    { key: "notifications", href: "/notifications", label: t.notifications.title, Icon: BellIcon },
    { key: "settings", href: "/settings", label: t.nav.settings, Icon: SettingsIcon },
    { key: "transactions", href: "/transactions", label: t.transactions.title, Icon: ReceiptIcon },
  ];

  const settingsLinks = [
    { id: SETTINGS_SECTION_IDS.profile, label: t.settings.profileSection },
    { id: SETTINGS_SECTION_IDS.password, label: t.profile.passwordSection },
    { id: SETTINGS_SECTION_IDS.code, label: t.withdrawalCode.settingsSection },
    { id: SETTINGS_SECTION_IDS.notifications, label: t.settings.notificationsSection },
    { id: SETTINGS_SECTION_IDS.language, label: lib.languageDisplay },
    { id: SETTINGS_SECTION_IDS.help, label: lib.helpPrivacy },
    { id: SETTINGS_SECTION_IDS.delete, label: t.settings.deleteAccount },
  ];

  const signOut = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="px-gutter pt-10">
      <div className="mx-auto grid max-w-[1120px] items-start gap-[clamp(24px,4vw,64px)] desk:grid-cols-[232px_minmax(0,1fr)] max-desk:gap-6">
        <nav
          aria-label={shell.account}
          className={cn(
            "flex flex-col gap-0.5 desk:sticky desk:top-[calc(var(--shell-bar-h)+24px)]",
            "max-desk:mq-rail max-desk:-mx-gutter max-desk:flex-row max-desk:gap-2 max-desk:overflow-x-auto max-desk:px-gutter",
          )}
        >
          <span className="text-kicker px-3.5 pb-2.5 max-desk:hidden">{shell.account}</span>
          {items.map(({ key, href, label, Icon }) => {
            const selected = key === current;
            const showCount = key === "notifications" && unreadCount > 0;
            return (
              <div key={key} className="contents">
                <Link
                  href={href}
                  aria-current={selected ? "page" : undefined}
                  className={cn(sideItemClass, selected && sideCurrentClass)}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                  {showCount && (
                    <span className="ml-auto inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-crimson px-[7px] text-xs font-extrabold text-white tabular-nums max-desk:ml-1">
                      <span aria-hidden>{unreadCount}</span>
                      <span className="sr-only">{lib.unreadBadge(unreadCount)}</span>
                    </span>
                  )}
                </Link>
                {key === "settings" && selected && (
                  <div className="mt-1 mb-2 flex flex-col gap-0.5 max-desk:hidden">
                    {settingsLinks.map((link) => (
                      <a
                        key={link.id}
                        href={`#${link.id}`}
                        className="flex h-9 items-center rounded-[10px] pr-3.5 pl-[46px] text-sm font-semibold text-fg-faint outline-none transition-colors duration-150 hover:bg-tonal-ghost hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <span aria-hidden className="mx-3.5 my-2.5 block h-px bg-hairline max-desk:hidden" />
          <button
            type="button"
            onClick={signOut}
            className="flex h-11 cursor-pointer items-center gap-3 rounded-[12px] border-0 bg-transparent px-3.5 text-left text-[15px] font-bold text-danger outline-none transition-colors duration-150 hover:bg-tonal-ghost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link max-desk:hidden"
          >
            <SignOutIcon size={20} />
            {shell.signOut}
          </button>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

/** The small uppercase line above an account page's H1 ("Account", "Activity"). */
export function AccountKicker({ children }: { children: ReactNode }) {
  return <p className="text-kicker">{children}</p>;
}
