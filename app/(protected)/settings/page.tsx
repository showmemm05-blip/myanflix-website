"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SettingsView, SettingsViewSkeleton } from "@/components/views/SettingsView";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { ApiError } from "@/services/api/apiClient";
import { ACCOUNT_DELETE_REFUSALS, profileService } from "@/services/api/profileService";
import type { NotificationPreferences } from "@/types/user";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleDeleteOpenChange = (open: boolean) => {
    // A reopened dialog never shows the last attempt's refusal.
    if (open) setDeleteError(null);
    setDeleteOpen(open);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await profileService.deleteAccount();
    } catch (err) {
      // The dialog stays open on a refusal, saying why in the reader's
      // language: money still in the wallet, or a deposit/withdrawal
      // waiting for review (409), or a staff account (403).
      const key =
        err instanceof ApiError
          ? ACCOUNT_DELETE_REFUSALS[err.message as keyof typeof ACCOUNT_DELETE_REFUSALS]
          : undefined;
      setDeleteError(key ? t.settings[key] : t.common.somethingWentWrong);
      setIsDeleting(false);
      return;
    }
    // The server has already signed every session out; this clears the
    // local one. Signed out on a protected page, RequireAuth sends the
    // browser to /login — go there directly rather than race it.
    setIsDeleting(false);
    setDeleteOpen(false);
    toast.success(t.settings.deleteDone);
    logout();
    router.replace("/login");
  };

  return (
    <SettingsView
      user={user}
      prefs={activePrefs}
      prefsError={isError}
      onRetryPrefs={() => refetch()}
      onUpdatePref={updatePref}
      deleteOpen={deleteOpen}
      onDeleteOpenChange={handleDeleteOpenChange}
      isDeleting={isDeleting}
      deleteError={deleteError}
      onConfirmDelete={handleDeleteAccount}
    />
  );
}
