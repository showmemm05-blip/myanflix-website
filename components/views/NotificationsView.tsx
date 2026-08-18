"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpFromLine,
  Bell,
  BellOff,
  CheckCheck,
  Crown,
  Film,
  Loader2,
  Megaphone,
  ShoppingBag,
  Tag,
  ThumbsDown,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Chip, Kicker, Surface, surfaceVariants } from "@/components/system";
import { AccountShell } from "@/components/views/AccountShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/context/language-context";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/notification";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  PURCHASE: ShoppingBag,
  SUBSCRIPTION: Crown,
  PAYMENT: Wallet,
  NEW_RELEASE: Film,
  PROMOTION: Tag,
  ANNOUNCEMENT: Megaphone,
  DEPOSIT_APPROVED: Wallet,
  DEPOSIT_REJECTED: ThumbsDown,
  WITHDRAWAL_APPROVED: ArrowUpFromLine,
  WITHDRAWAL_REJECTED: ThumbsDown,
  BALANCE_ADJUSTED: Wallet,
};

/** Semantic type→color: money=finance, subscription=premium, approved=success, rejected=destructive, general=info. */
const TYPE_CLASS: Record<NotificationType, string> = {
  PURCHASE: "bg-finance/15 text-finance ring-finance/25",
  SUBSCRIPTION: "bg-premium/15 text-premium ring-premium/25",
  PAYMENT: "bg-finance/15 text-finance ring-finance/25",
  NEW_RELEASE: "bg-info/15 text-info ring-info/25",
  PROMOTION: "bg-info/15 text-info ring-info/25",
  ANNOUNCEMENT: "bg-info/15 text-info ring-info/25",
  DEPOSIT_APPROVED: "bg-success/15 text-success ring-success/25",
  DEPOSIT_REJECTED: "bg-destructive/15 text-destructive ring-destructive/25",
  WITHDRAWAL_APPROVED: "bg-success/15 text-success ring-success/25",
  WITHDRAWAL_REJECTED: "bg-destructive/15 text-destructive ring-destructive/25",
  BALANCE_ADJUSTED: "bg-finance/15 text-finance ring-finance/25",
};

/**
 * Consecutive notifications from the same calendar day share a heading, so the
 * feed reads as a timeline instead of one undifferentiated stack. The incoming
 * order is never re-sorted — groups are cut where the day changes.
 */
function groupByDay(items: AppNotification[]) {
  const groups: { key: string; label: string; items: AppNotification[] }[] = [];
  for (const item of items) {
    const label = new Date(item.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const current = groups[groups.length - 1];
    if (current && current.label === label) current.items.push(item);
    else groups.push({ key: item.id, label, items: [item] });
  }
  return groups;
}

function NotificationCard({
  notification,
  unreadLabel,
  onClick,
}: {
  notification: AppNotification;
  unreadLabel: string;
  onClick: () => void;
}) {
  const Icon = TYPE_ICON[notification.type];

  // The card IS the control — a link when the notification points at a title, a
  // button when it only marks itself read. Either way it is focusable, has a
  // name, and answers Enter/Space, which the click-only <div> never did.
  const cardClass = cn(
    surfaceVariants({ radius: "xl" }),
    "relative flex w-full cursor-pointer gap-3.5 overflow-hidden p-4 text-left active:scale-[0.99]",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring",
    notification.isRead
      ? "hover:bg-card/70 hover:ring-white/14"
      : "bg-primary/8 ring-primary/25 hover:bg-primary/12",
  );

  const content = (
    <>
      {/* Unread marker on the leading edge — reads before any text does. */}
      {!notification.isRead && (
        <span aria-hidden className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-primary" />
      )}

      {notification.posterUrl ? (
        <span className="relative block size-11 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-white/10 ring-inset">
          <Image src={notification.posterUrl} alt="" fill sizes="44px" className="object-cover" />
        </span>
      ) : (
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
            TYPE_CLASS[notification.type],
          )}
        >
          <Icon className="size-5" />
        </span>
      )}

      <span className="block min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm",
              notification.isRead ? "font-medium text-foreground/90" : "font-semibold",
            )}
          >
            {notification.title}
          </span>
          {!notification.isRead && (
            <Chip tone="primary" variant="outline" size="sm">
              {unreadLabel}
            </Chip>
          )}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">{notification.message}</span>
        <span className="mt-1.5 block text-xs text-muted-foreground">
          {formatRelativeDate(notification.createdAt)}
        </span>
      </span>
    </>
  );

  return notification.movieId ? (
    <Link href={`/movie/${notification.movieId}`} onClick={onClick} className={cardClass}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cardClass}>
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

export function NotificationsView({
  notifications,
  isLoading,
  isError,
  onRetry,
  onMarkAllRead,
  onClearAll,
  onNotificationClick,
}: NotificationsViewProps) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState<"markAllRead" | "clearAll" | null>(null);
  const hasItems = !!notifications && notifications.length > 0;

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

  return (
    <AccountShell>
      <PageHeader
        eyebrow={t.notifications.eyebrow}
        title={t.notifications.title}
        subtitle={t.notifications.subtitle}
        actions={
          hasItems ? (
            <>
              <Button
                variant="outline"
                onClick={handleMarkAllRead}
                disabled={busy !== null}
                className="h-10 rounded-full px-4"
              >
                {busy === "markAllRead" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="size-3.5" />
                )}
                {t.notifications.markAllRead}
              </Button>
              <Button
                variant="ghost"
                onClick={handleClearAll}
                disabled={busy !== null}
                className="h-10 rounded-full px-4 text-muted-foreground hover:text-destructive"
              >
                {busy === "clearAll" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                {t.notifications.clearAll}
              </Button>
            </>
          ) : undefined
        }
      />

      {isError ? (
        <ErrorState onRetry={onRetry} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Surface key={i} radius="xl" className="flex gap-3.5 p-4">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 py-0.5">
                <Skeleton className="h-4 w-1/2 max-w-48" />
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-16" />
              </div>
            </Surface>
          ))}
        </div>
      ) : !hasItems ? (
        <EmptyState
          icon={BellOff}
          title={t.notifications.empty}
          description={t.notifications.emptyDescription}
        />
      ) : (
        <div className="flex flex-col gap-7">
          {groupByDay(notifications).map((group) => (
            <section key={group.key} className="flex flex-col gap-3">
              <Kicker className="px-1">{group.label}</Kicker>
              {group.items.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  unreadLabel={t.notifications.unread}
                  onClick={() => onNotificationClick(notification)}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
