"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, KeyRound, Moon, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";

import { DeleteAccountDialog } from "@/components/dialogs/DeleteAccountDialog";
import { ErrorState } from "@/components/empty/ErrorState";
import { ProfileDetailsForm, ProfilePasswordForm, ProfilePhotoEditor } from "@/components/profile/ProfileSections";
import { SegmentedControl } from "@/components/system";
import { AlertCircleIcon, FeedbackIcon, LockIcon } from "@/components/system/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AccountKicker, AccountLayout, SETTINGS_SECTION_IDS } from "@/components/views/AccountShell";
import { useShellFeedback } from "@/components/layout/shell-context";
import { WithdrawalCodeDialog } from "@/components/withdrawal-code/WithdrawalCodeDialog";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { libraryText } from "@/lib/i18n/sections/library";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import { formatLockTime, lockEndFromIso } from "@/lib/withdrawal-code";
import type { WithdrawalCodeStatus } from "@/services/api/withdrawalCodeService";
import type { AppUser, NotificationPreferences } from "@/types/user";

export interface SettingsViewProps {
  user: AppUser;
  prefs: NotificationPreferences | undefined;
  prefsError: boolean;
  onRetryPrefs: () => void;
  onUpdatePref: (key: keyof NotificationPreferences, value: boolean) => void;
  /** Delete account (DELETE /users/me) — the page owns the call and its outcome. */
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  /** The server's refusal (or a failure), already translated; null when none. */
  deleteError: string | null;
  onConfirmDelete: () => void;
  /** Withdrawal code (GET /users/me/withdrawal-code) — the page owns the calls. */
  withdrawalCodeStatus: WithdrawalCodeStatus | undefined;
  withdrawalCodeError: boolean;
  onRetryWithdrawalCode: () => void;
  /** Re-reads the status fresh, then opens the dialog. */
  onOpenWithdrawalCode: () => void;
  isOpeningWithdrawalCode: boolean;
  withdrawalCodeDialog: { open: boolean; status: WithdrawalCodeStatus | null; key: number };
  onWithdrawalCodeDialogOpenChange: (open: boolean) => void;
}

/** One settings panel (Settings board): #121217, radius 16, 28px padding (20 on phones). */
function SettingsPanel({
  id,
  title,
  description,
  danger = false,
  children,
}: {
  id: string;
  title: ReactNode;
  description?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className={cn(
        "scroll-mt-[calc(var(--shell-bar-h)+24px)] rounded-[16px] p-7 max-desk:p-5",
        danger ? "bg-danger/7" : "bg-surface",
      )}
    >
      <h2
        id={`${id}-h`}
        className={cn("flex items-center gap-2.5 text-section-title", danger ? "text-danger" : "text-fg")}
      >
        {title}
      </h2>
      {description && <p className="mt-1 text-sm leading-5 text-fg-faint">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/**
 * The withdrawal code's status: a disc (green = set, red = locked, crimson =
 * not made yet), the line, and Create code / Change code. A lock shows when
 * it ends (on this computer's clock, never more than 15 minutes away, in the
 * reader's language) and gives way to "set" the moment it runs out. The
 * parent keys it by `lockedUntil`, so every new lock reads the clock afresh.
 */
function WithdrawalCodeStatusRow({
  status,
  onOpen,
  isOpening,
}: {
  status: WithdrawalCodeStatus;
  onOpen: () => void;
  isOpening: boolean;
}) {
  const { t, language } = useLanguage();
  const tc = t.withdrawalCode;
  const [lockEnd] = useState(() => (status.hasCode ? lockEndFromIso(status.lockedUntil, Date.now()) : null));
  const [lockOver, setLockOver] = useState(false);
  useEffect(() => {
    if (lockEnd === null) return;
    const timer = setTimeout(() => setLockOver(true), Math.max(0, lockEnd - Date.now()));
    return () => clearTimeout(timer);
  }, [lockEnd]);
  const locked = lockEnd !== null && !lockOver;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
      <span
        aria-hidden
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full",
          locked ? "bg-danger/14 text-danger" : status.hasCode ? "bg-money/14 text-money" : "bg-crimson/14 text-link",
        )}
      >
        {locked ? <LockIcon size={22} /> : status.hasCode ? <ShieldCheck className="size-[22px]" strokeWidth={1.75} /> : <KeyRound className="size-[22px]" strokeWidth={1.75} />}
      </span>
      <p
        id="withdrawal-code-status"
        className={cn("min-w-[220px] flex-1 text-[15px] leading-[22px]", locked ? "text-danger" : "text-fg-body")}
      >
        {!status.hasCode ? tc.statusNone : locked ? tc.statusLocked(formatLockTime(lockEnd, language)) : tc.statusSet}
      </p>
      <Button
        variant={status.hasCode ? "tonal" : "commit"}
        size="cta"
        className="pl-[18px]"
        onClick={onOpen}
        busy={isOpening}
        busyLabel={status.hasCode ? tc.changeCode : tc.createCode}
        aria-haspopup="dialog"
        aria-describedby="withdrawal-code-status"
      >
        <KeyRound className="size-[18px]" strokeWidth={1.75} />
        {status.hasCode ? tc.changeCode : tc.createCode}
      </Button>
    </div>
  );
}

/** A row in Help & privacy: icon disc, title + line, one action. */
function HelpRow({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tonal-faint text-fg-body">
        {icon}
      </span>
      <div className="min-w-[220px] flex-1">
        <p className="text-[15px] leading-[22px] font-bold text-fg">{title}</p>
        <p className="mt-0.5 text-[13px] leading-[18px] text-fg-faint">{body}</p>
      </div>
      {action}
    </div>
  );
}

/**
 * The Settings page (Settings board): the account side menu (with links to
 * every panel), then seven panels — Profile (photo, display name, read-only
 * username and phone), Password, Withdrawal code, Notifications (four
 * switches), Language & display, Help & privacy, and the red Danger zone.
 */
export function SettingsView({
  user,
  prefs,
  prefsError,
  onRetryPrefs,
  onUpdatePref,
  deleteOpen,
  onDeleteOpenChange,
  isDeleting,
  deleteError,
  onConfirmDelete,
  withdrawalCodeStatus,
  withdrawalCodeError,
  onRetryWithdrawalCode,
  onOpenWithdrawalCode,
  isOpeningWithdrawalCode,
  withdrawalCodeDialog,
  onWithdrawalCodeDialogOpenChange,
}: SettingsViewProps) {
  const { t, language, setLanguage } = useLanguage();
  const lib = useSection(libraryText);
  const shell = useSection(shellText);
  const openFeedback = useShellFeedback();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const tc = t.withdrawalCode;

  // Deep links such as /settings#s-notifications (from the Notifications
  // page) arrive before the panels exist, so the browser's own jump misses.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  const prefItems: { key: keyof NotificationPreferences; label: string; description: string }[] = [
    { key: "purchaseConfirmations", label: t.settings.prefPurchases, description: t.settings.prefPurchasesDescription },
    { key: "newReleases", label: t.settings.prefNewReleases, description: t.settings.prefNewReleasesDescription },
    { key: "promotions", label: t.settings.prefPromotions, description: t.settings.prefPromotionsDescription },
    { key: "announcements", label: t.settings.prefAnnouncements, description: t.settings.prefAnnouncementsDescription },
  ];

  return (
    <AccountLayout current="settings">
      <AccountKicker>{t.settings.eyebrow}</AccountKicker>
      <h1 className="mt-1.5 text-title text-fg">{t.settings.title}</h1>
      <p className="mt-1.5 text-base leading-6 text-fg-muted">{t.settings.subtitle}</p>

      <div className="mt-7 flex flex-col gap-4">
        <SettingsPanel id={SETTINGS_SECTION_IDS.profile} title={t.settings.profileSection} description={t.settings.profileDescription}>
          <div className="flex flex-col gap-6">
            <ProfilePhotoEditor user={user} size={64} />
            <ProfileDetailsForm user={user} idPrefix="settings" value={displayName} onValueChange={setDisplayName} />
          </div>
        </SettingsPanel>

        <SettingsPanel
          id={SETTINGS_SECTION_IDS.password}
          title={t.profile.passwordSection}
          description={t.profile.passwordSectionDescription}
        >
          <ProfilePasswordForm idPrefix="settings" layout="panel" />
        </SettingsPanel>

        {/* Asked for on every withdrawal (web and app alike); made on the
            first one if it doesn't exist yet. */}
        <SettingsPanel id={SETTINGS_SECTION_IDS.code} title={tc.settingsSection} description={tc.settingsDescription}>
          {withdrawalCodeError ? (
            <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-danger/14 text-danger">
                <AlertCircleIcon size={22} />
              </span>
              <p className="min-w-[220px] flex-1 text-[15px] leading-[22px] text-fg-body">{lib.codeLoadError}</p>
              <Button variant="tonal" size="cta" onClick={onRetryWithdrawalCode}>
                {t.common.retry}
              </Button>
            </div>
          ) : !withdrawalCodeStatus ? (
            <div aria-busy="true" className="flex items-center gap-4">
              <p role="status" className="sr-only">
                {lib.loadingCode}
              </p>
              <span className="mq-skeleton block size-12 shrink-0 rounded-full" />
              <span className="mq-skeleton block h-3.5 max-w-[360px] flex-1 rounded-[5px]" />
              <span className="mq-skeleton ml-auto block h-12 w-[148px] rounded-[12px] max-desk:hidden" />
            </div>
          ) : (
            <WithdrawalCodeStatusRow
              key={withdrawalCodeStatus.lockedUntil ?? "unlocked"}
              status={withdrawalCodeStatus}
              onOpen={onOpenWithdrawalCode}
              isOpening={isOpeningWithdrawalCode}
            />
          )}
        </SettingsPanel>

        <SettingsPanel
          id={SETTINGS_SECTION_IDS.notifications}
          title={t.settings.notificationsSection}
          description={t.settings.notificationsDescription}
        >
          {prefsError ? (
            <ErrorState onRetry={onRetryPrefs} description={shell.errorBody} className="[&>div]:py-8" />
          ) : !prefs ? (
            <div aria-busy="true" className="-mt-4">
              {prefItems.map((item) => (
                <div key={item.key} aria-hidden className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <span className="mq-skeleton block h-4 w-36 max-w-full rounded-[5px]" />
                    <span className="mq-skeleton mt-1.5 block h-3 w-56 max-w-full rounded-[5px]" />
                  </div>
                  <span className="mq-skeleton block h-8 w-[52px] shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="-mt-4">
              {prefItems.map((item, index) => (
                <div
                  key={item.key}
                  className={cn(
                    "flex items-center justify-between gap-4 py-4",
                    index < prefItems.length - 1 && "shadow-[inset_0_-1px_0_var(--mq-tonal-ghost)]",
                  )}
                >
                  <div className="min-w-0">
                    <p id={`pref-${item.key}`} className="text-[15px] leading-[22px] font-bold text-fg">
                      {item.label}
                    </p>
                    <p id={`pref-${item.key}-d`} className="mt-0.5 text-[13px] leading-[18px] text-fg-faint">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    id={item.key}
                    checked={prefs?.[item.key] ?? false}
                    onCheckedChange={(checked) => onUpdatePref(item.key, checked)}
                    aria-labelledby={`pref-${item.key}`}
                    aria-describedby={`pref-${item.key}-d`}
                    // Off reads against the panel (the raised fill nearly vanishes on #121217).
                    className="data-unchecked:bg-hairline-strong data-unchecked:shadow-none"
                  />
                </div>
              ))}
            </div>
          )}
        </SettingsPanel>

        <SettingsPanel
          id={SETTINGS_SECTION_IDS.language}
          title={lib.languageDisplay}
          description={lib.languageDisplayBody}
        >
          <div className="grid gap-x-4 gap-y-6 desk:grid-cols-2">
            <div>
              <p id="settings-language-label" className="text-[13px] leading-[18px] font-bold text-fg-muted">
                {t.settings.languageLabel}
              </p>
              <SegmentedControl
                labelledBy="settings-language-label"
                value={language}
                onChange={(value) => setLanguage(value)}
                className="mt-2 [&>button]:h-11 [&>button]:text-[15px]"
                options={[
                  { value: "en", label: "English", lang: "en" },
                  { value: "mm", label: "မြန်မာ", lang: "my" },
                ]}
              />
              <p className="mt-2 text-[13px] leading-[18px] text-fg-faint">{lib.languageHelp}</p>
            </div>
            <div>
              <label htmlFor="settings-theme" className="block text-[13px] leading-[18px] font-bold text-fg-muted">
                {t.settings.themeLabel}
              </label>
              <div className="relative mt-2">
                <Moon className="pointer-events-none absolute top-4 left-4 size-5 text-fg-muted" strokeWidth={1.75} />
                <input
                  id="settings-theme"
                  type="text"
                  value={t.settings.themeDark}
                  readOnly
                  aria-describedby="settings-theme-help"
                  className="block h-[52px] w-full rounded-[12px] border-0 bg-tonal-ghost pr-4 pl-12 text-base text-fg-body outline-none focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)]"
                />
              </div>
              <p id="settings-theme-help" className="mt-2 text-[13px] leading-[18px] text-fg-faint">
                {lib.themeHelp}
              </p>
            </div>
          </div>
        </SettingsPanel>

        <SettingsPanel id={SETTINGS_SECTION_IDS.help} title={lib.helpPrivacy} description={lib.helpPrivacyBody}>
          <div className="-mt-4">
            <HelpRow
              icon={<FeedbackIcon size={20} />}
              title={t.feedback.title}
              body={t.feedback.description}
              action={
                <Button variant="tonal" size="toolbar" className="font-extrabold" aria-haspopup="dialog" onClick={openFeedback}>
                  {t.feedback.trigger}
                </Button>
              }
            />
            <div aria-hidden className="h-px bg-tonal-ghost" />
            <HelpRow
              icon={<ShieldCheck className="size-5" strokeWidth={1.75} />}
              title={lib.privacyPolicy}
              body={t.settings.privacyDescription}
              action={
                <Link
                  href="/privacy"
                  className={cn(buttonVariants({ variant: "tonal", size: "toolbar" }), "gap-1.5 pr-3 font-extrabold")}
                >
                  {t.settings.privacyLink}
                  <ArrowUpRight className="size-4" strokeWidth={1.75} />
                </Link>
              }
            />
          </div>
        </SettingsPanel>

        <SettingsPanel
          id={SETTINGS_SECTION_IDS.delete}
          danger
          title={
            <>
              <TriangleAlert className="size-5" strokeWidth={1.75} aria-hidden />
              {t.settings.dangerZone}
            </>
          }
          description={t.settings.deleteAccountDescription}
        >
          <Button variant="danger" size="cta" className="pl-[18px]" aria-haspopup="dialog" onClick={() => onDeleteOpenChange(true)}>
            <Trash2 className="size-[18px]" strokeWidth={1.75} />
            {t.settings.deleteAccount}
          </Button>
        </SettingsPanel>
      </div>

      <WithdrawalCodeDialog
        open={withdrawalCodeDialog.open}
        onOpenChange={onWithdrawalCodeDialogOpenChange}
        status={withdrawalCodeDialog.status}
        flowKey={withdrawalCodeDialog.key}
      />

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        walletBalance={user.walletBalance}
        isDeleting={isDeleting}
        error={deleteError}
        onConfirm={onConfirmDelete}
      />
    </AccountLayout>
  );
}

export function SettingsViewSkeleton() {
  const { t } = useLanguage();
  return (
    <AccountLayout current="settings">
      <AccountKicker>{t.settings.eyebrow}</AccountKicker>
      <h1 className="mt-1.5 text-title text-fg">{t.settings.title}</h1>
      <p className="mt-1.5 text-base leading-6 text-fg-muted">{t.settings.subtitle}</p>
      <div aria-busy="true" className="mt-7 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="mq-skeleton block h-44 rounded-[16px]" />
        ))}
      </div>
    </AccountLayout>
  );
}
