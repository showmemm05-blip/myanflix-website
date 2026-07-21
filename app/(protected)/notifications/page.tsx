"use client";

import Link from "next/link";
import Image from "next/image";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Bell, CheckCheck, Film, Megaphone, ShoppingBag, Tag, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { notificationService } from "@/services/api/notificationService";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/notification";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  PURCHASE: ShoppingBag,
  PAYMENT: Wallet,
  NEW_RELEASE: Film,
  PROMOTION: Tag,
  ANNOUNCEMENT: Megaphone,
};

function NotificationItem({ notification }: { notification: AppNotification }) {
  const queryClient = useQueryClient();
  const Icon = TYPE_ICON[notification.type];

  const handleClick = async () => {
    if (!notification.isRead) {
      await notificationService.markAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  };

  const content = (
    <div
      onClick={handleClick}
      className={cn(
        "flex cursor-pointer gap-3 rounded-xl border border-white/[0.08] p-3.5 transition-colors hover:bg-secondary/40",
        !notification.isRead && "bg-primary/5",
      )}
    >
      {notification.posterUrl ? (
        <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image src={notification.posterUrl} alt="" fill sizes="44px" className="object-cover" />
        </div>
      ) : (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="size-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{notification.title}</p>
          {!notification.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">{formatRelativeDate(notification.createdAt)}</p>
      </div>
    </div>
  );

  return notification.movieId ? (
    <Link href={`/movie/${notification.movieId}`}>{content}</Link>
  ) : (
    content
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getNotifications(),
  });

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleClearAll = async () => {
    await notificationService.clearAll();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stay up to date with your account.</p>
        </div>
        {notifications && notifications.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              <Trash2 className="size-3.5" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="No notifications right now." />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );
}
