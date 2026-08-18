"use client";

import { useRouter } from "next/navigation";
import { ProfileView, ProfileViewSkeleton } from "@/components/views/ProfileView";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  if (!user) return <ProfileViewSkeleton />;

  return (
    <ProfileView
      user={user}
      onSaveProfile={() => toast.info(t.profile.stubNotice)}
      onChangePassword={() => toast.info(t.profile.stubNotice)}
      onLogout={() => {
        logout();
        router.push("/login");
      }}
    />
  );
}
