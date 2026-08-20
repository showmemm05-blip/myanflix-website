"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SettingsView, SettingsViewSkeleton } from "@/components/views/SettingsView";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { profileService } from "@/services/api/profileService";
import type { NotificationPreferences } from "@/types/user";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: prefs,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => profileService.getNotificationPreferences(),
    enabled: Boolean(user),
  });
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const activePrefs = preferences ?? prefs;

  if (!user) return <SettingsViewSkeleton />;

  const updatePref = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      const updated = await profileService.updateNotificationPreferences({ [key]: value });
      setPreferences(updated);
    } catch {
      toast.error(t.common.somethingWentWrong);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await profileService.deleteAccount();
      logout();
      router.push("/");
      toast.info(t.settings.deleteStubNotice);
    } catch {
      toast.error(t.common.somethingWentWrong);
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <SettingsView
      user={user}
      prefs={activePrefs}
      prefsError={isError}
      onRetryPrefs={() => refetch()}
      onUpdatePref={updatePref}
      deleteOpen={deleteOpen}
      onDeleteOpenChange={setDeleteOpen}
      isDeleting={isDeleting}
      onConfirmDelete={handleDeleteAccount}
    />
  );
}
