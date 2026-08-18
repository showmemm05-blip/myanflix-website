"use client";

import { useQueryClient, useQuery } from "@tanstack/react-query";
import { NotificationsView } from "@/components/views/NotificationsView";
import { notificationService } from "@/services/api/notificationService";
import type { AppNotification } from "@/types/notification";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, isError, refetch } = useQuery({
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

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await notificationService.markAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  };

  return (
    <NotificationsView
      notifications={notifications}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      onMarkAllRead={handleMarkAllRead}
      onClearAll={handleClearAll}
      onNotificationClick={handleNotificationClick}
    />
  );
}
