"use client";

import { useRef, useState } from "react";
import { Camera, Eye, EyeOff, Image as ImageIcon, KeyRound, Loader2, Lock, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/api/apiClient";
import { profileService } from "@/services/api/profileService";
import type { AppUser } from "@/types/user";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — mirrors the backend limit.
const MAX_DISPLAY_NAME = 40; // Mirrors the backend's 1..40 rule.
const MIN_PASSWORD = 8;

// The dialog idioms this app already uses everywhere else.
const dialogContentClass = "gap-5 rounded-3xl p-5 ring-white/10 sm:max-w-md sm:p-6";
const dialogInputClass = "h-11 rounded-xl border-white/10 bg-white/[0.04] px-3.5 dark:bg-white/[0.04]";
const dialogFooterClass = "mx-0 mb-0 border-0 bg-transparent p-0 pt-1";

/** One titled block inside the modal — icon disc, heading, and its own controls. */
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-white/8 pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25 ring-inset">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** A password input with its own show/hide eye and inline error slot. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  autoComplete,
  showLabel,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoComplete: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(dialogInputClass, "pr-11")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          title={visible ? hideLabel : showLabel}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors duration-150 ease-out outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** A login identity the account owner can see but not edit. */
function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm nums">{value}</p>
    </div>
  );
}

/**
 * THE profile modal. One dialog, three independently-saving sections — photo,
 * details, password — in a single scrollable body. Splitting the saves is the
 * whole point: a mistyped current password must not block a name change, and a
 * photo upload must not wait on either.
 *
 * Closing keeps unsaved display-name edits (no "discard?" interrogation for a
 * one-field form), but always wipes the password inputs — a typed secret has no
 * business surviving a close. A close is refused outright while a save is in
 * flight, so nothing is left half-applied.
 */
export function ProfileEditDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AppUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo
  const [photoBusy, setPhotoBusy] = useState<"upload" | "remove" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Details
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [savingName, setSavingName] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const busy = photoBusy !== null || savingName || savingPassword;

  const clearPreview = () => {
    setPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  };

  const resetPasswordFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPasswordError(null);
  };

  const handleOpenChange = (next: boolean) => {
    // Never yank the dialog out from under an in-flight save.
    if (!next && busy) return;
    if (!next) resetPasswordFields();
    onOpenChange(next);
  };

  // ── Photo ──────────────────────────────────────────────────────────────
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast.error(t.profile.photoInvalidType);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t.profile.photoTooLarge);
      return;
    }

    // Optimistic local preview, swapped for the server URL on success.
    clearPreview();
    setPreview(URL.createObjectURL(file));
    setPhotoBusy("upload");
    try {
      const updated = await profileService.uploadAvatar(file);
      updateUser(updated); // Navbar avatar refreshes instantly — no reload.
      toast.success(t.profile.photoUpdated);
    } catch {
      toast.error(t.profile.photoUploadFailed);
    } finally {
      clearPreview();
      setPhotoBusy(null);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoBusy("remove");
    try {
      const updated = await profileService.removeAvatar();
      updateUser(updated);
      toast.success(t.profile.photoRemoved);
    } catch {
      toast.error(t.profile.photoRemoveFailed);
    } finally {
      clearPreview();
      setPhotoBusy(null);
    }
  };

  // ── Details ────────────────────────────────────────────────────────────
  const trimmedName = displayName.trim();
  const nextName = trimmedName.length > 0 ? trimmedName : null;
  const nameTooLong = trimmedName.length > MAX_DISPLAY_NAME;
  const nameDirty = nextName !== (user.displayName ?? null);

  const handleSaveName = async () => {
    if (!nameDirty || nameTooLong) return;
    setSavingName(true);
    try {
      const updated = await profileService.updateProfile(nextName);
      updateUser(updated);
      setDisplayName(updated.displayName ?? "");
      toast.success(t.profile.profileUpdated);
    } catch {
      toast.error(t.profile.profileUpdateFailed);
    } finally {
      setSavingName(false);
    }
  };

  // ── Password ───────────────────────────────────────────────────────────
  const newPasswordError =
    newPassword.length > 0 && newPassword.length < MIN_PASSWORD ? t.profile.passwordTooShort : null;
  const confirmPasswordError =
    confirmPassword.length > 0 && confirmPassword !== newPassword ? t.profile.passwordMismatch : null;
  const passwordValid =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD &&
    confirmPassword === newPassword;

  const handleChangePassword = async () => {
    if (!passwordValid) return;
    setCurrentPasswordError(null);
    setSavingPassword(true);
    try {
      await profileService.changePassword(currentPassword, newPassword);
      resetPasswordFields();
      toast.success(t.profile.passwordUpdated);
    } catch (error) {
      // The backend's own "Your current password is incorrect" belongs on the
      // field it's about, localized — a bare toast makes the user hunt for it.
      const message = error instanceof ApiError ? error.message : "";
      if (/current password/i.test(message)) {
        setCurrentPasswordError(t.profile.passwordCurrentIncorrect);
      } else {
        toast.error(t.profile.passwordUpdateFailed);
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const shownAvatar = preview ?? user.avatarUrl;
  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          dialogContentClass,
          // A tall, scrollable body: a near-full-height sheet on phones, a
          // comfortable card on desktop.
          "flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-lg max-sm:h-[calc(100dvh-2rem)]",
        )}
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-section-title">{t.profile.editProfile}</DialogTitle>
          <DialogDescription>{t.profile.editProfileDescription}</DialogDescription>
        </DialogHeader>

        {/* -mx-1/px-1 keeps focus rings from being clipped by the scroller. */}
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1">
          <Section
            icon={ImageIcon}
            title={t.profile.photoSection}
            description={t.profile.photoSectionDescription}
          >
            <div className="flex items-center gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
                {shownAvatar ? (
                  // Plain <img> on purpose: the avatar host is the request-derived
                  // LAN address of the cache server, which next/image remotePatterns
                  // can't enumerate ahead of time (and blob: previews aren't remote).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shownAvatar} alt={user.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center font-heading text-2xl font-bold text-muted-foreground select-none">
                    {initials}
                  </div>
                )}
                {photoBusy !== null && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-11 rounded-full px-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  <Camera className="size-4" />
                  {user.avatarUrl ? t.profile.changePhoto : t.profile.uploadPhoto}
                </Button>
                {user.avatarUrl && (
                  <Button
                    variant="destructive"
                    className="h-11 rounded-full px-4"
                    onClick={handleRemovePhoto}
                    disabled={busy}
                  >
                    <Trash2 className="size-4" />
                    {t.profile.removePhoto}
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </Section>

          <Section
            icon={UserRound}
            title={t.profile.detailsSection}
            description={t.profile.detailsSectionDescription}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-display-name">{t.profile.displayNameLabel}</Label>
              <Input
                id="profile-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user.username}
                maxLength={80}
                disabled={savingName}
                aria-invalid={nameTooLong}
                aria-describedby={nameTooLong ? "profile-display-name-error" : undefined}
                className={dialogInputClass}
              />
              {nameTooLong ? (
                <p id="profile-display-name-error" className="text-xs text-destructive">
                  {t.profile.displayNameTooLong}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{t.profile.displayNameHint}</p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <ReadOnlyRow label={t.profile.usernameLabel} value={user.username} />
              <ReadOnlyRow label={t.profile.phoneLabel} value={user.phone ?? t.profile.phoneNotSet} />
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              {t.profile.loginIdentityNote}
            </p>

            <Button
              className="h-11 w-fit rounded-full px-6"
              onClick={handleSaveName}
              disabled={!nameDirty || nameTooLong || savingName}
            >
              {savingName && <Loader2 className="size-4 animate-spin" />}
              {t.common.save}
            </Button>
          </Section>

          <Section
            icon={KeyRound}
            title={t.profile.passwordSection}
            description={t.profile.passwordSectionDescription}
          >
            <PasswordField
              id="profile-current-password"
              label={t.profile.currentPasswordLabel}
              value={currentPassword}
              onChange={(v) => {
                setCurrentPassword(v);
                setCurrentPasswordError(null);
              }}
              error={currentPasswordError ?? undefined}
              disabled={savingPassword}
              autoComplete="current-password"
              showLabel={t.profile.showPassword}
              hideLabel={t.profile.hidePassword}
            />
            <PasswordField
              id="profile-new-password"
              label={t.profile.newPasswordLabel}
              value={newPassword}
              onChange={setNewPassword}
              error={newPasswordError ?? undefined}
              disabled={savingPassword}
              autoComplete="new-password"
              showLabel={t.profile.showPassword}
              hideLabel={t.profile.hidePassword}
            />
            <PasswordField
              id="profile-confirm-password"
              label={t.profile.confirmPasswordLabel}
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={confirmPasswordError ?? undefined}
              disabled={savingPassword}
              autoComplete="new-password"
              showLabel={t.profile.showPassword}
              hideLabel={t.profile.hidePassword}
            />
            <Button
              variant="outline"
              className="h-11 w-fit rounded-full px-6"
              onClick={handleChangePassword}
              disabled={!passwordValid || savingPassword}
            >
              {savingPassword && <Loader2 className="size-4 animate-spin" />}
              {t.profile.updatePassword}
            </Button>
          </Section>
        </div>

        <DialogFooter className={dialogFooterClass}>
          <Button
            variant="ghost"
            className="h-11 rounded-full px-5"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            {t.common.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
