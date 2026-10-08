"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { CheckCheck, CircleArrowUp, CircleCheck, CircleX, Megaphone, Tag as TagGlyph, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { Artwork } from "@/components/system/Artwork";
import { BellIcon, CrownIcon, InfoIcon, MediaIcon, ReceiptIcon, WalletIcon } from "@/components/system/icons";
import { Button } from "@/components/ui/button";
import { AccountKicker, AccountLayout, SETTINGS_SECTION_IDS } from "@/components/views/AccountShell";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { clockTime, dayHeading, libraryText } from "@/lib/i18n/sections/library";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/notification";

type IconType = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

/**
 * Type → icon and colour (the mobile Notifications board's mapping): money in
 * green, Premium in gold, releases in crimson, refusals in red, notices in
 * blue, balance adjustments in amber. Read rows fall back to a quiet grey disc.
 */
const TYPE_STYLE: Record<NotificationType, { Icon: IconType; tone: string }> = {
  PURCHASE: { Icon: ReceiptIcon, tone: "bg-info/14 text-info" },
  SUBSCRIPTION: { Icon: CrownIcon, tone: "bg-gold/16 text-gold" },
  PAYMENT: { Icon: WalletIcon, tone: "bg-money/14 text-money" },
  NEW_RELEASE: { Icon: MediaIcon, tone: "bg-crimson/16 text-link" },
  PROMOTION: { Icon: TagGlyph, tone: "bg-gold/16 text-gold" },
  ANNOUNCEMENT: { Icon: Megaphone, tone: "bg-info/14 text-info" },
  DEPOSIT_APPROVED: { Icon: CircleCheck, tone: "bg-money/14 text-money" },
  DEPOSIT_REJECTED: { Icon: CircleX, tone: "bg-danger/14 text-danger" },
  WITHDRAWAL_APPROVED: { Icon: CircleArrowUp, tone: "bg-money/14 text-money" },
  WITHDRAWAL_REJECTED: { Icon: CircleX, tone: "bg-danger/14 text-danger" },
  BALANCE_ADJUSTED: { Icon: WalletIcon, tone: "bg-pending/14 text-pending" },
};

function NotificationRow({ notification, onClick }: { notification: AppNotification; onClick: () => void }) {
  const { language } = useLanguage();
  const lib = useSection(libraryText);
  const unread = !notification.isRead;
  const { Icon, tone } = TYPE_STYLE[notification.type] ?? { Icon: BellIcon, tone: "bg-info/14 text-info" };

  // The row IS the control — a link when the notification points at a title,
  // a button when it only marks itself read. Either way it is focusable, has
  // a name, and answers Enter/Space.
  const rowClass = cn(
    "flex w-full cursor-pointer items-start gap-3.5 rounded-[16px] border-0 p-4 text-left text-fg outline-none transition-colors duration-150",
    "hover:bg-white/7 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
    unread ? "bg-white/5" : "bg-transparent",
  );

  const content = (
    <>
      {notification.posterUrl ? (
        <span aria-hidden className="relative block size-11 shrink-0 overflow-hidden rounded-[10px] bg-raised">
          <Artwork src={notification.posterUrl} seed={notification.title} variant="poster" sizes="44px" />
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            unread ? tone : "bg-tonal-ghost text-fg-muted",
          )}
        >
          <Icon size={22} strokeWidth={1.75} />
        </span>
      )}

      <span className="block min-w-0 flex-1">
        {unread && <span className="sr-only">{lib.unreadPrefix} </span>}
        <span
          className={cn(
            "block text-[15px] leading-[22px]",
            unread ? "font-extrabold text-fg" : "font-semibold text-fg-body",
          )}
        >
          {notification.title}
        </span>
        <span className="mt-0.5 block text-sm leading-[21px] text-fg-muted">{notification.message}</span>
        <span className="mt-1.5 block text-xs leading-4 text-fg-faint tabular-nums">
          {/* The day is in the group heading; the row gives the time of day. */}
          <time dateTime={notification.createdAt}>{clockTime(notification.createdAt, language)}</time>
        </span>
      </span>

      {unread && <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-crimson" />}
    </>
  );

  return notification.movieId ? (
    <Link href={`/movie/${notification.movieId}`} onClick={onClick} className={rowClass}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={rowClass}>
      {content}
    </button>
  );
}

export interface NotificationsViewProps {
  notifications: AppNotification[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onMarkAllRead: () => void | Promise<void>;
  onClearAll: () => void | Promise<void>;
  /** Marks unread notifications read (await + cache invalidate handled by the page). */
  onNotificationClick: (notification: AppNotification) => void;
}

/**
 * The Notifications page (Notifications board): the account side menu, an
 * "Activity" kicker, the H1 with a crimson "3 new" pill, Mark all read
 * (tonal) and Clear all (quiet, red on hover), then the feed grouped by day
 * (Today / Yesterday / weekday + date — the incoming order is never
 * re-sorted, groups are cut where the day changes).
 */
export function NotificationsView({
  notifications,
  isLoading,
  isError,
  onRetry,
  onMarkAllRead,
  onClearAll,
  onNotificationClick,
}: NotificationsViewProps) {
  const { t, language } = useLanguage();
  const lib = useSection(libraryText);
  const shell = useSection(shellText);
  const [busy, setBusy] = useState<"markAllRead" | "clearAll" | null>(null);
  const hasItems = !!notifications && notifications.length > 0;
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const handleMarkAllRead = async () => {
    setBusy("markAllRead");
    try {
      await onMarkAllRead();
    } finally {
      setBusy(null);
    }
  };

  const handleClearAll = async () => {
    setBusy("clearAll");
    try {
      await onClearAll();
    } finally {
      setBusy(null);
    }
  };

  const groups: { key: string; label: string; items: AppNotification[] }[] = [];
  for (const item of notifications ?? []) {
    const day = dayHeading(item.createdAt, language, lib);
    const label = day.relative ? day.label : day.date ? `${day.label}, ${day.date}` : day.label;
    const last = groups[groups.length - 1];
    if (last && last.key === day.key) last.items.push(item);
    else groups.push({ key: day.key, label, items: [item] });
  }

  return (
    <AccountLayout current="notifications">
      <div className="flex items-end justify-between gap-x-6 gap-y-4 max-desk:flex-col max-desk:items-start">
        <div className="min-w-0">
          <AccountKicker>{t.notifications.eyebrow}</AccountKicker>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            <h1 className="mt-1.5 text-title text-fg">{t.notifications.title}</h1>
            {!isLoading && !isError && unreadCount > 0 && (
              <span
                role="status"
                className="mt-1.5 inline-flex h-[26px] items-center rounded-full bg-crimson px-2.5 text-[13px] font-extrabold text-white tabular-nums"
              >
                {lib.newCount(unreadCount)}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-base leading-6 text-fg-muted">{t.notifications.subtitle}</p>
        </div>
        {hasItems && !isError && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="tonal"
              size="toolbar"
              className="pl-3 font-extrabold"
              onClick={handleMarkAllRead}
              disabled={busy !== null || unreadCount === 0}
              busy={busy === "markAllRead"}
              busyLabel={t.notifications.markAllRead}
            >
              <CheckCheck strokeWidth={1.75} />
              {t.notifications.markAllRead}
            </Button>
            <Button
              variant="ghost"
              size="toolbar"
              className="px-3 text-fg-muted hover:bg-transparent hover:text-danger"
              onClick={handleClearAll}
              disabled={busy !== null}
              busy={busy === "clearAll"}
              busyLabel={t.notifications.clearAll}
            >
              <Trash2 strokeWidth={1.75} />
              {t.notifications.clearAll}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8">
        {isError ? (
          <ErrorState onRetry={onRetry} description={shell.errorBody} />
        ) : isLoading ? (
          <div aria-busy="true" className="flex flex-col gap-2">
            <p role="status" className="sr-only">
              {lib.loadingNotifications}
            </p>
            <span className="mq-skeleton mb-1.5 block h-4 w-[120px] rounded-[5px]" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} aria-hidden className="flex gap-3.5 p-4">
                <span className="mq-skeleton block size-11 shrink-0 rounded-full" />
                <span className="flex-1">
                  <span className="mq-skeleton block h-4 w-2/5 rounded-[5px]" />
                  <span className="mq-skeleton mt-2.5 block h-[13px] w-4/5 rounded-[5px]" />
                  <span className="mq-skeleton mt-2.5 block h-[11px] w-16 rounded-[5px]" />
                </span>
              </div>
            ))}
          </div>
        ) : !hasItems ? (
          <EmptyState
            icon={BellIcon}
            headingLevel="h2"
            title={t.notifications.empty}
            description={lib.notificationsEmptyBody}
            className="py-10"
          />
        ) : (
          <div className="flex flex-col gap-7">
            {groups.map((group) => (
              <section key={group.key} aria-labelledby={`notif-day-${group.key}`}>
                <h2 id={`notif-day-${group.key}`} className="text-kicker mb-2 px-4">
                  {group.label}
                </h2>
                <div className="flex flex-col gap-1">
                  {group.items.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      onClick={() => onNotificationClick(notification)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 flex items-start gap-2 px-4 text-[13px] leading-[18px] text-fg-faint">
          <InfoIcon size={16} className="mt-px shrink-0" />
          <span>
            {lib.notificationsNote(
              <Link
                key="settings-link"
                href={`/settings#${SETTINGS_SECTION_IDS.notifications}`}
                className="mq-link rounded-[4px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
              >
                {t.nav.settings}
              </Link>,
            )}
          </span>
        </p>
      </div>
    </AccountLayout>
  );
}
