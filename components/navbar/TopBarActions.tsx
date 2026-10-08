"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { BellIcon, SearchIcon, WalletIcon } from "@/components/system/icons";
import { isActiveHref } from "@/components/system/nav";
import { useAuth } from "@/lib/context/auth-context";
import { formatKyat } from "@/lib/currency";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/api/notificationService";
import { paymentService } from "@/services/api/paymentService";

/** 40px round icon button look shared by the top bar's search and bell. */
export const TOPBAR_ICON_BUTTON =
  "relative flex size-10 shrink-0 items-center justify-center rounded-full text-fg outline-none transition-colors duration-150 hover:bg-white/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link";

/** Search: opens the search page. */
export function SearchButton() {
  const s = useSection(shellText);
  return (
    <Link href="/search" aria-label={s.search} className={TOPBAR_ICON_BUTTON}>
      <SearchIcon size={22} />
    </Link>
  );
}

/**
 * The bell, with a crimson dot while anything is unread. Same query key and
 * service call the old shell used (["notifications", "unread-count"]), so the
 * notifications page keeps clearing the same cache entry. On the
 * notifications page itself the bell is the current page: aria-current and
 * a 10% white disc (Notifications board).
 */
export function NotificationsBell() {
  const { user } = useAuth();
  const pathname = usePathname();
  const current = isActiveHref(pathname, "/notifications");
  const s = useSection(shellText);
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: Boolean(user),
  });

  if (!user) return null;
  return (
    <Link
      href="/notifications"
      aria-label={unreadCount > 0 ? s.notificationsUnread(unreadCount) : s.notifications}
      aria-current={current ? "page" : undefined}
      className={cn(TOPBAR_ICON_BUTTON, current && "bg-white/10")}
    >
      <BellIcon size={22} />
      {unreadCount > 0 && (
        <span
          aria-hidden
          className="absolute top-2 right-[9px] size-2 rounded-full bg-crimson shadow-[0_0_0_2px_var(--mq-ground)]"
        />
      )}
    </Link>
  );
}

/**
 * The green wallet balance pill (desktop only — phones reach the wallet from
 * the dock). Reads the same ["wallet-summary"] query as the wallet page, the
 * subscribe dialog and the realtime socket listener, so the figure updates
 * the moment a deposit is approved. Until it loads it shows the balance the
 * session already knows.
 */
export function BalancePill({ className }: { className?: string }) {
  const { user } = useAuth();
  const s = useSection(shellText);
  const { data } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  if (!user) return null;
  const balance = data?.balance ?? user.walletBalance;
  if (typeof balance !== "number" || !Number.isFinite(balance)) return null;
  const amount = formatKyat(balance);

  return (
    <Link
      href="/wallet"
      aria-label={s.walletBalance(amount)}
      className={cn(
        "mx-1 flex h-9 shrink-0 items-center gap-[7px] rounded-full bg-money/14 pr-3.5 pl-[11px] text-sm font-extrabold text-money tabular-nums outline-none transition-colors duration-150 hover:bg-money/22 hover:text-money focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link max-desk:hidden",
        className,
      )}
    >
      <WalletIcon size={18} />
      {amount}
    </Link>
  );
}
