import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("glass-card flex items-center gap-4 rounded-xl border-white/[0.08] p-4", className)}>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}
