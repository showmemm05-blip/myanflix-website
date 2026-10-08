"use client";

import { useState } from "react";
import { Image as ImageIcon, KeyRound, UserRound } from "lucide-react";

import { Modal } from "@/components/system";
import {
  ProfileDetailsForm,
  ProfilePasswordForm,
  ProfilePhotoEditor,
  ProfileSectionHeading,
} from "@/components/profile/ProfileSections";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import type { AppUser } from "@/types/user";

type Part = "photo" | "details" | "password";

/**
 * THE Edit profile dialog (Profile board): one Marquee dialog — a centred
 * 560px panel on desktop, a bottom sheet on phones — with three parts that
 * each save on their own: Photo, Details, Password.
 *
 * Closing keeps an unsaved display-name edit (the name lives here, and this
 * component stays mounted), but always wipes the password inputs (they live
 * in the form, which unmounts with the dialog). A close is refused outright
 * while any save is in flight, so nothing is left half-applied.
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
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [busyParts, setBusyParts] = useState<Record<Part, boolean>>({
    photo: false,
    details: false,
    password: false,
  });
  const busy = busyParts.photo || busyParts.details || busyParts.password;
  const busyFor = (part: Part) => (value: boolean) => setBusyParts((prev) => ({ ...prev, [part]: value }));

  const handleOpenChange = (next: boolean) => {
    // Never yank the dialog out from under an in-flight save.
    if (!next && busy) return;
    onOpenChange(next);
  };

  const sectionClass = "flex flex-col gap-4 pt-6 shadow-[inset_0_1px_0_var(--mq-hairline)] first:pt-0 first:shadow-none";

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t.profile.editProfile}
      subtitle={t.profile.editProfileDescription}
      dismissible={!busy}
      className="desk:max-w-[min(600px,calc(100%-48px))]"
      footer={
        <Button variant="tonal" size="cta" onClick={() => handleOpenChange(false)} disabled={busy}>
          {t.common.close}
        </Button>
      }
    >
      <section className={sectionClass}>
        <ProfileSectionHeading
          icon={<ImageIcon className="size-[18px]" strokeWidth={1.75} />}
          title={t.profile.photoSection}
          description={t.profile.photoSectionDescription}
        />
        <ProfilePhotoEditor user={user} size={80} locked={busyParts.details || busyParts.password} onBusyChange={busyFor("photo")} />
      </section>

      <section className={sectionClass}>
        <ProfileSectionHeading
          icon={<UserRound className="size-[18px]" strokeWidth={1.75} />}
          title={t.profile.detailsSection}
          description={t.profile.detailsSectionDescription}
        />
        <ProfileDetailsForm
          user={user}
          idPrefix="profile"
          value={displayName}
          onValueChange={setDisplayName}
          onBusyChange={busyFor("details")}
        />
      </section>

      <section className={sectionClass}>
        <ProfileSectionHeading
          icon={<KeyRound className="size-[18px]" strokeWidth={1.75} />}
          title={t.profile.passwordSection}
          description={t.profile.passwordSectionDescription}
        />
        <ProfilePasswordForm idPrefix="profile" layout="stack" onBusyChange={busyFor("password")} />
      </section>
    </Modal>
  );
}
