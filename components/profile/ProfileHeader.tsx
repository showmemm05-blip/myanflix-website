import Image from "next/image";
import type { AppUser } from "@/types/user";

export function ProfileHeader({ user }: { user: AppUser }) {
  return (
    <div className="glass-card flex flex-col items-center gap-4 rounded-2xl border-white/[0.08] p-6 text-center sm:flex-row sm:text-left">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-2 border-primary/40 bg-muted">
        <Image src={user.avatarUrl} alt={user.name} fill sizes="96px" className="object-cover" />
      </div>
      <div>
        <p className="text-xl font-bold">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Member since {new Date(user.joinDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
