"use client";

import { useRef, useState } from "react";
import { Camera, Crown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuroraBackdrop, Chip, Surface } from "@/components/system";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { profileService } from "@/services/api/profileService";
import type { AppUser } from "@/types/user";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — mirrors the backend limit.

/**
 * Identity hero for the profile page — quiet glass lit by a contained aurora,
 * holding the avatar (with its change/remove controls), the identity lines, and
 * subscription state in one glanceable block.
 *
 * The upload behaviour is unchanged: the camera disc opens the hidden file
 * input, the same MIME/size guards run before any request, and the remove
 * button only exists once there is a photo to remove.
 */
export function ProfileHeader({ user }: { user: AppUser }) {
  const { t } = useLanguage();
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  const initials = user.name.slice(0, 2).toUpperCase();

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

    setBusy("upload");
    try {
      const updated = await profileService.uploadAvatar(file);
      updateUser(updated); // Navbar avatar refreshes instantly — no reload.
      toast.success(t.profile.photoUpdated);
    } catch {
      toast.error(t.profile.photoUploadFailed);
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    setBusy("remove");
    try {
      const updated = await profileService.removeAvatar();
      updateUser(updated);
      toast.success(t.profile.photoRemoved);
    } catch {
      toast.error(t.profile.photoRemoveFailed);
    } finally {
      setBusy(null);
    }
  };

  const memberSince = new Date(user.joinDate).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const expiresAt = user.subscriptionExpiresAt
    ? new Date(user.subscriptionExpiresAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Surface
      as="section"
      tone="raised"
      radius="2xl"
      className="isolate overflow-hidden p-6 sm:p-8"
    >
      <AuroraBackdrop variant="panel" className="opacity-70" />

      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-7 sm:text-left">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="relative size-24">
            <div className="relative size-24 overflow-hidden rounded-full bg-muted ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
              {user.avatarUrl ? (
                // Plain <img> on purpose: the avatar host is the request-derived
                // LAN address of the cache server, which next/image remotePatterns
                // can't enumerate ahead of time.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center font-heading text-3xl font-bold text-muted-foreground select-none">
                  {initials}
                </div>
              )}
              {busy !== null && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy !== null}
              aria-label={t.profile.changePhoto}
              title={t.profile.changePhoto}
              className="absolute -right-1 -bottom-1 z-10 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-e2 ring-2 ring-background transition-[filter,transform] duration-200 ease-out outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:pointer-events-none disabled:opacity-60"
            >
              <Camera className="size-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {user.avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={busy !== null}
              className="h-8 rounded-full px-2.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              {t.profile.removePhoto}
            </Button>
          )}
        </div>

        <div className="min-w-0">
          <h2 className="truncate font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {user.name}
          </h2>
          {/* Secondary identity line: the phone the account signed up with; the
              name heading right above already covers username-only accounts. */}
          {user.phone && <p className="truncate text-sm text-muted-foreground nums">{user.phone}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{t.profile.memberSince(memberSince)}</p>
          <div className="mt-3.5 flex justify-center sm:justify-start">
            {user.isSubscribed && expiresAt ? (
              <Chip tone="premium" variant="outline">
                <Crown className="size-3.5" />
                {t.profile.subscriptionActive(expiresAt)}
              </Chip>
            ) : (
              <Chip tone="neutral" variant="outline">
                {t.profile.notSubscribed}
              </Chip>
            )}
          </div>
        </div>
      </div>
    </Surface>
  );
}
