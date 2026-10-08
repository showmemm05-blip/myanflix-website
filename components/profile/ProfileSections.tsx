"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Camera, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Field, FieldError, FieldHelp, fieldClass } from "@/components/system";
import { InfoIcon, LockIcon } from "@/components/system/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { libraryText } from "@/lib/i18n/sections/library";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/api/apiClient";
import { profileService } from "@/services/api/profileService";
import type { AppUser } from "@/types/user";

/**
 * THE PROFILE EDITING PARTS — photo, details, password — shared by the
 * Edit profile dialog (Profile page) and the Settings page's Profile and
 * Password panels. Each part saves on its own: a mistyped current password
 * never blocks a name change, and a photo upload never waits on either.
 * Every service call, guard and message is the one the old dialog used.
 */

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — mirrors the backend limit.
export const MAX_DISPLAY_NAME = 40; // Mirrors the backend's 1..40 rule.
const MIN_PASSWORD = 8;

export function initialsOf(user: AppUser) {
  return user.name.slice(0, 2).toUpperCase();
}

// ── Avatar ──────────────────────────────────────────────────────────────

/** The round photo, or the initials disc. Decorative (the name is always next to it). */
export function AvatarDisc({
  user,
  src,
  size,
  busy = false,
  className,
}: {
  user: AppUser;
  /** Overrides the account photo (a local preview while uploading). */
  src?: string | null;
  size: number;
  busy?: boolean;
  className?: string;
}) {
  const shown = src ?? user.avatarUrl;
  return (
    <span
      aria-hidden
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full bg-avatar shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {shown ? (
        // Plain <img> on purpose: the avatar host is the request-derived LAN
        // address of the cache server, which next/image remotePatterns can't
        // enumerate ahead of time (and blob: previews aren't remote).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="" className="size-full object-cover" />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center font-extrabold text-avatar-ink select-none"
          style={{ fontSize: Math.round(size * 0.34) }}
        >
          {initialsOf(user)}
        </span>
      )}
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-ground/60">
          <span className="mq-skeleton size-1/3 rounded-full" />
        </span>
      )}
    </span>
  );
}

/**
 * Upload / remove the account photo. Same MIME and size guards before any
 * request, the same toasts, and the refreshed user goes straight into the
 * auth context so the top-bar avatar changes without a reload.
 */
export function useAvatarActions(onBusyChange?: (busy: boolean) => void) {
  const { t } = useLanguage();
  const { updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusyState] = useState<"upload" | "remove" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const setBusy = (next: "upload" | "remove" | null) => {
    setBusyState(next);
    onBusyChange?.(next !== null);
  };

  const clearPreview = () => {
    setPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
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
    setBusy("upload");
    try {
      const updated = await profileService.uploadAvatar(file);
      updateUser(updated);
      toast.success(t.profile.photoUpdated);
    } catch {
      toast.error(t.profile.photoUploadFailed);
    } finally {
      clearPreview();
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("remove");
    try {
      const updated = await profileService.removeAvatar();
      updateUser(updated);
      toast.success(t.profile.photoRemoved);
    } catch {
      toast.error(t.profile.photoRemoveFailed);
    } finally {
      clearPreview();
      setBusy(null);
    }
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      tabIndex={-1}
      aria-hidden
      onChange={onFileChange}
    />
  );

  return { busy, preview, pick: () => inputRef.current?.click(), remove, fileInput };
}

/** Photo row: avatar, Change/Upload (tonal) and Remove photo (red text), plus the file rules. */
export function ProfilePhotoEditor({
  user,
  size = 80,
  locked = false,
  onBusyChange,
}: {
  user: AppUser;
  size?: number;
  /** Another part of the form is saving — hold these buttons. */
  locked?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useLanguage();
  const lib = useSection(libraryText);
  const shell = useSection(shellText);
  const photo = useAvatarActions(onBusyChange);
  const disabled = locked || photo.busy !== null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
      <AvatarDisc user={user} src={photo.preview} size={size} busy={photo.busy !== null} />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="tonal"
            size="toolbar"
            className="pl-3 font-extrabold"
            onClick={photo.pick}
            disabled={disabled}
            busy={photo.busy === "upload"}
            busyLabel={shell.working}
          >
            <Camera strokeWidth={1.75} />
            {user.avatarUrl ? t.profile.changePhoto : t.profile.uploadPhoto}
          </Button>
          {user.avatarUrl && (
            <Button
              variant="ghost"
              size="toolbar"
              className="px-3 text-danger hover:bg-danger/10"
              onClick={photo.remove}
              disabled={disabled}
              busy={photo.busy === "remove"}
              busyLabel={shell.working}
            >
              <Trash2 strokeWidth={1.75} />
              {t.profile.removePhoto}
            </Button>
          )}
        </div>
        <p className="text-[13px] leading-[18px] text-fg-faint">{lib.photoHelp}</p>
      </div>
      {photo.fileInput}
    </div>
  );
}

// ── Details ─────────────────────────────────────────────────────────────

/** A read-only sign-in identity (username, phone), with a lock. */
function ReadOnlyField({ id, label, value, type = "text" }: { id: string; label: string; value: string; type?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={type}
          value={value}
          readOnly
          className="block h-[52px] w-full min-w-0 rounded-[12px] border-0 bg-tonal-ghost pr-11 pl-4 text-base text-fg-body tabular-nums outline-none focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)]"
        />
        <LockIcon size={18} className="pointer-events-none absolute top-[17px] right-4 text-fg-faint" />
      </div>
    </div>
  );
}

/**
 * Display name (max 40, empty = shown by username) with Save, and the
 * read-only username and phone. The value is controlled by the parent so the
 * Edit profile dialog can keep an unsaved name across a close, as before.
 */
export function ProfileDetailsForm({
  user,
  idPrefix,
  value,
  onValueChange,
  onBusyChange,
}: {
  user: AppUser;
  idPrefix: string;
  value: string;
  onValueChange: (value: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useLanguage();
  const { updateUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const trimmed = value.trim();
  const nextName = trimmed.length > 0 ? trimmed : null;
  const tooLong = trimmed.length > MAX_DISPLAY_NAME;
  const dirty = nextName !== (user.displayName ?? null);
  const nameId = `${idPrefix}-display-name`;

  const save = async () => {
    if (!dirty || tooLong) return;
    setSaving(true);
    onBusyChange?.(true);
    try {
      const updated = await profileService.updateProfile(nextName);
      updateUser(updated);
      onValueChange(updated.displayName ?? "");
      toast.success(t.profile.profileUpdated);
    } catch {
      toast.error(t.profile.profileUpdateFailed);
    } finally {
      setSaving(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <Field
        id={nameId}
        label={t.profile.displayNameLabel}
        help={t.profile.displayNameHint}
        error={tooLong ? t.profile.displayNameTooLong : undefined}
      >
        {(control) => (
          <input
            {...control}
            type="text"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={user.username}
            maxLength={80}
            autoComplete="nickname"
            disabled={saving}
            className={fieldClass()}
          />
        )}
      </Field>

      <div className="grid gap-x-4 gap-y-[18px] desk:grid-cols-2">
        <ReadOnlyField id={`${idPrefix}-username`} label={t.profile.usernameLabel} value={user.username} />
        <ReadOnlyField
          id={`${idPrefix}-phone`}
          type="tel"
          label={t.profile.phoneLabel}
          value={user.phone ?? t.profile.phoneNotSet}
        />
      </div>
      <p className="flex items-start gap-2 text-[13px] leading-[18px] text-fg-faint">
        <InfoIcon size={16} className="mt-px shrink-0" />
        {t.profile.loginIdentityNote}
      </p>

      <Button
        variant="commit"
        size="cta"
        className="w-fit"
        onClick={save}
        disabled={!dirty || tooLong}
        busy={saving}
        busyLabel={t.common.save}
      >
        {t.common.save}
      </Button>
    </div>
  );
}

// ── Password ────────────────────────────────────────────────────────────

/** A password input with its own show/hide eye and inline error. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  autoComplete,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  autoComplete: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(fieldClass(), "pr-[52px]")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t.profile.hidePassword : t.profile.showPassword}
          aria-pressed={visible}
          className="absolute top-1 right-1 flex size-11 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-fg-muted outline-none transition-colors duration-150 hover:bg-tonal-faint hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
        >
          {visible ? <EyeOff className="size-5" strokeWidth={1.75} /> : <Eye className="size-5" strokeWidth={1.75} />}
        </button>
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

/**
 * Current / new / confirm, 8-character minimum, mismatch check, and the
 * backend's "current password is incorrect" shown on the field it is about.
 * Update password only arms once the form is valid. The fields live here, so
 * closing the dialog (which unmounts it) always wipes a typed secret.
 *
 * `layout="panel"` (Settings): current password at half width, new + confirm
 * side by side on desktop. `layout="stack"` (dialog): one column.
 */
export function ProfilePasswordForm({
  idPrefix,
  layout = "stack",
  onBusyChange,
}: {
  idPrefix: string;
  layout?: "stack" | "panel";
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useLanguage();
  const lib = useSection(libraryText);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const nextError = next.length > 0 && next.length < MIN_PASSWORD ? t.profile.passwordTooShort : null;
  const confirmError = confirm.length > 0 && confirm !== next ? t.profile.passwordMismatch : null;
  const valid = current.length > 0 && next.length >= MIN_PASSWORD && confirm === next;

  const submit = async () => {
    if (!valid) return;
    setCurrentError(null);
    setSaving(true);
    onBusyChange?.(true);
    try {
      await profileService.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success(t.profile.passwordUpdated);
    } catch (error) {
      // The backend's own "Your current password is incorrect" belongs on the
      // field it's about, localized — a bare toast makes the user hunt for it.
      const message = error instanceof ApiError ? error.message : "";
      if (/current password/i.test(message)) {
        setCurrentError(t.profile.passwordCurrentIncorrect);
      } else {
        toast.error(t.profile.passwordUpdateFailed);
      }
    } finally {
      setSaving(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <PasswordField
        id={`${idPrefix}-current-password`}
        label={t.profile.currentPasswordLabel}
        value={current}
        onChange={(v) => {
          setCurrent(v);
          setCurrentError(null);
        }}
        error={currentError}
        disabled={saving}
        autoComplete="current-password"
        className={layout === "panel" ? "desk:max-w-[calc(50%-8px)]" : undefined}
      />
      <div className={cn("grid gap-x-4 gap-y-[18px]", layout === "panel" && "desk:grid-cols-2")}>
        <PasswordField
          id={`${idPrefix}-new-password`}
          label={t.profile.newPasswordLabel}
          value={next}
          onChange={setNext}
          error={nextError}
          disabled={saving}
          autoComplete="new-password"
        />
        <PasswordField
          id={`${idPrefix}-confirm-password`}
          label={t.profile.confirmPasswordLabel}
          value={confirm}
          onChange={setConfirm}
          error={confirmError}
          disabled={saving}
          autoComplete="new-password"
        />
      </div>
      <FieldHelp className="mt-0">{lib.passwordHelp}</FieldHelp>
      <Button
        variant="commit"
        size="cta"
        className="w-fit"
        onClick={submit}
        disabled={!valid}
        busy={saving}
        busyLabel={t.profile.updatePassword}
      >
        {t.profile.updatePassword}
      </Button>
    </div>
  );
}

/** A titled block inside the Edit profile dialog: crimson icon disc, heading, line. */
export function ProfileSectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-crimson/14 text-link">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-base leading-[22px] font-extrabold text-fg">{title}</h3>
        <p className="mt-0.5 text-[13px] leading-[18px] text-fg-faint">{description}</p>
      </div>
    </div>
  );
}
