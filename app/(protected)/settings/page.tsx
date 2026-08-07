"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { PageLoader } from "@/components/loading/Spinner";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { profileService } from "@/services/api/profileService";
import type { NotificationPreferences } from "@/types/user";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: prefs } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => profileService.getNotificationPreferences(),
    enabled: Boolean(user),
  });
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const activePrefs = preferences ?? prefs;

  if (!user) return <PageLoader />;

  const updatePref = async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = await profileService.updateNotificationPreferences({ [key]: value });
    setPreferences(updated);
  };

  const handleSaveProfile = () => {
    toast.info("Profile editing isn't connected to the backend yet.");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    await profileService.deleteAccount();
    setIsDeleting(false);
    setDeleteOpen(false);
    logout();
    router.push("/");
    toast.info("Account deletion isn't connected to the backend yet — you've been logged out.");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="glass-card border-white/[0.08]">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-name">Full name</Label>
              <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button onClick={handleSaveProfile} className="w-fit">
              Save changes
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/[0.08]">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your account password.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" />
            </div>
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => toast.info("Password changes aren't connected to the backend yet.")}
            >
              Update password
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/[0.08]">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose what you want to be notified about.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {[
              { key: "purchaseConfirmations" as const, label: "Purchase confirmations" },
              { key: "newReleases" as const, label: "New releases" },
              { key: "promotions" as const, label: "Promotions & discounts" },
              { key: "announcements" as const, label: "Platform announcements" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <Label htmlFor={item.key} className="font-normal">
                  {item.label}
                </Label>
                <Switch
                  id={item.key}
                  checked={activePrefs?.[item.key] ?? false}
                  onCheckedChange={(checked) => updatePref(item.key, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/[0.08]">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Language and appearance.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Language</Label>
              <Select
                items={{ mm: "မြန်မာ (Myanmar)", en: "English" }}
                value={language}
                onValueChange={(v) => v && setLanguage(v as "en" | "mm")}
              >
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">မြန်မာ (Myanmar)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Theme</Label>
              <Select items={{ dark: "Dark" }} value="dark" disabled>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">MyanFlix is currently dark-theme only.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>Permanently delete your account and all associated data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-2" />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete your account?"
        description="This will permanently delete your account, purchases and watch history. This action cannot be undone."
        confirmLabel="Delete Account"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
