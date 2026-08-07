"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, LogOut, Pencil, Wallet } from "lucide-react";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { StatCard } from "@/components/cards/StatCard";
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
import { PageLoader } from "@/components/loading/Spinner";
import { useAuth } from "@/lib/context/auth-context";
import { formatKyat } from "@/lib/currency";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");

  if (!user) return <PageLoader />;

  const handleSaveProfile = () => {
    setEditOpen(false);
    toast.info("Profile editing isn't connected to the backend yet.");
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <ProfileHeader user={user} />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Wallet Balance" value={formatKyat(user.walletBalance)} />
        <StatCard
          icon={Crown}
          label="Subscription"
          value={
            user.isSubscribed && user.subscriptionExpiresAt
              ? `Active · exp. ${new Date(user.subscriptionExpiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : "Not subscribed"
          }
        />
        <StatCard icon={Wallet} label="Total Spent" value={formatKyat(user.totalSpent)} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          Edit Profile
        </Button>
        <Button variant="outline" onClick={() => setPasswordOpen(true)}>
          Change Password
        </Button>
        <Button variant="outline" onClick={handleLogout} className="text-destructive hover:text-destructive">
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your current password and a new one.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setPasswordOpen(false);
                toast.info("Password changes aren't connected to the backend yet.");
              }}
            >
              Update password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
