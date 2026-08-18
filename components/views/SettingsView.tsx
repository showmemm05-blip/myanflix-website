"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { ErrorState } from "@/components/empty/ErrorState";
import { SectionHeader, Surface } from "@/components/system";
import { AccountShell } from "@/components/views/AccountShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/context/language-context";
import type { AppUser, NotificationPreferences } from "@/types/user";

export interface SettingsViewProps {
  user: AppUser;
  prefs: NotificationPreferences | undefined;
  prefsError: boolean;
  onRetryPrefs: () => void;
  onUpdatePref: (key: keyof NotificationPreferences, value: boolean) => void;
  /** Stub — the page fires the localized "not connected" toast. */
  onSaveProfile: () => void;
  /** Stub — the page fires the localized "not connected" toast. */
  onUpdatePassword: () => void;
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onConfirmDelete: () => void;
}

const inputClass = "h-11 rounded-xl border-white/10 bg-white/[0.04] px-3.5 dark:bg-white/[0.04]";
const selectTriggerClass =
  "h-11 w-full rounded-xl border-white/10 bg-white/[0.04] px-3.5 data-[size=default]:h-11 sm:w-64 dark:bg-white/[0.04] dark:hover:bg-white/8";

/** One group of settings — the page is nothing but a stack of these. */
function SettingsPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Surface as="section" radius="2xl" className="p-5 sm:p-6">
      <SectionHeader as="h2" title={title} description={description} />
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </Surface>
  );
}

/** A labelled preference row: name + explanation on the left, control on the right. */
function PreferenceRow({
  id,
  label,
  description,
  control,
}: {
  id?: string;
  label: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-1 py-3.5 transition-colors duration-150 ease-out first:pt-0 last:pb-0 hover:bg-white/[0.02]">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {control}
    </div>
  );
}

export function SettingsView({
  user,
  prefs,
  prefsError,
  onRetryPrefs,
  onUpdatePref,
  onSaveProfile,
  onUpdatePassword,
  deleteOpen,
  onDeleteOpenChange,
  isDeleting,
  onConfirmDelete,
}: SettingsViewProps) {
  const { t, language, setLanguage } = useLanguage();
  const [name, setName] = useState(user.name);

  const prefItems: {
    key: keyof NotificationPreferences;
    label: string;
    description: string;
  }[] = [
    {
      key: "purchaseConfirmations",
      label: t.settings.prefPurchases,
      description: t.settings.prefPurchasesDescription,
    },
    {
      key: "newReleases",
      label: t.settings.prefNewReleases,
      description: t.settings.prefNewReleasesDescription,
    },
    {
      key: "promotions",
      label: t.settings.prefPromotions,
      description: t.settings.prefPromotionsDescription,
    },
    {
      key: "announcements",
      label: t.settings.prefAnnouncements,
      description: t.settings.prefAnnouncementsDescription,
    },
  ];

  return (
    <AccountShell>
      <PageHeader eyebrow={t.settings.eyebrow} title={t.settings.title} subtitle={t.settings.subtitle} />

      <div className="flex flex-col gap-5">
        <SettingsPanel title={t.settings.profileSection} description={t.settings.profileDescription}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-name">{t.profile.fullNameLabel}</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <Button className="h-11 w-fit rounded-full px-6" onClick={onSaveProfile}>
            {t.common.save}
          </Button>
        </SettingsPanel>

        <SettingsPanel title={t.settings.passwordSection} description={t.settings.passwordDescription}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="current-password">{t.profile.currentPasswordLabel}</Label>
              <Input id="current-password" type="password" className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">{t.profile.newPasswordLabel}</Label>
              <Input id="new-password" type="password" className={inputClass} />
            </div>
          </div>
          <Button variant="outline" className="h-11 w-fit rounded-full px-6" onClick={onUpdatePassword}>
            {t.profile.changePassword}
          </Button>
        </SettingsPanel>

        <SettingsPanel
          title={t.settings.notificationsSection}
          description={t.settings.notificationsDescription}
        >
          {prefsError ? (
            <ErrorState onRetry={onRetryPrefs} className="py-10" />
          ) : !prefs ? (
            <div className="flex flex-col">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 px-1 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-36 max-w-full" />
                    <Skeleton className="mt-1.5 h-3 w-56 max-w-full" />
                  </div>
                  <Skeleton className="h-[18.4px] w-8 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col">
              {prefItems.map((item) => (
                <PreferenceRow
                  key={item.key}
                  id={item.key}
                  label={item.label}
                  description={item.description}
                  control={
                    <Switch
                      id={item.key}
                      checked={prefs?.[item.key] ?? false}
                      onCheckedChange={(checked) => onUpdatePref(item.key, checked)}
                    />
                  }
                />
              ))}
            </div>
          )}
        </SettingsPanel>

        <SettingsPanel title={t.settings.preferencesSection}>
          <div className="flex flex-col gap-2">
            <Label>{t.settings.languageLabel}</Label>
            <Select
              items={{ mm: "မြန်မာ (Myanmar)", en: "English" }}
              value={language}
              onValueChange={(v) => v && setLanguage(v as "en" | "mm")}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mm">မြန်မာ (Myanmar)</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t.settings.themeLabel}</Label>
            <Select items={{ dark: t.settings.themeDark }} value="dark" disabled>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t.settings.themeDark}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t.settings.themeDarkOnly}</p>
          </div>
        </SettingsPanel>

        {/* The one panel that breaks the quiet-glass rule on purpose. */}
        <Surface
          as="section"
          radius="2xl"
          className="bg-destructive/6 p-5 ring-destructive/25 sm:p-6"
        >
          <SectionHeader
            as="h2"
            title={
              <span className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4.5" />
                {t.settings.dangerZone}
              </span>
            }
            description={t.settings.deleteAccountDescription}
          />
          <Button
            variant="destructive"
            className="mt-5 h-11 rounded-full px-6"
            onClick={() => onDeleteOpenChange(true)}
          >
            <Trash2 className="size-4" />
            {t.settings.deleteAccount}
          </Button>
        </Surface>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        title={t.settings.deleteConfirmTitle}
        description={t.settings.deleteConfirmDescription}
        confirmLabel={t.settings.deleteAccount}
        variant="destructive"
        loading={isDeleting}
        onConfirm={onConfirmDelete}
      />
    </AccountShell>
  );
}

export function SettingsViewSkeleton() {
  return (
    <AccountShell backdrop={false}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-3xl" />
        ))}
      </div>
    </AccountShell>
  );
}
