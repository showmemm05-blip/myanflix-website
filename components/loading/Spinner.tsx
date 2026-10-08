"use client";

import { Loader2 } from "lucide-react";

import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";

/**
 * A small crimson spinner — for a button-sized wait only. Rows, grids and
 * pages load with skeletons (mq-skeleton / RowSkeleton), never a spinner.
 */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("size-5 animate-spin text-crimson", className)} />;
}

/**
 * Route-level wait (session restore before a protected page): the plain
 * ground with a quiet spinner and a hidden "Loading" status.
 */
export function PageLoader({ label }: { label?: string }) {
  const s = useSection(shellText);
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] items-center justify-center bg-ground">
      <Spinner className="size-8" />
      <span className="sr-only">{label ?? s.loading}</span>
    </div>
  );
}
