"use client";

import { useRouter } from "next/navigation";
import { ProfileView, ProfileViewSkeleton } from "@/components/views/ProfileView";
import { useAuth } from "@/lib/context/auth-context";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return <ProfileViewSkeleton />;

  // Profile edits live inside ProfileEditDialog, which owns its own service
  // calls and pushes the refreshed user into the auth context — the page has
  // nothing left to hand down.
  return (
    <ProfileView
      user={user}
      onLogout={() => {
        logout();
        router.push("/login");
      }}
    />
  );
}
