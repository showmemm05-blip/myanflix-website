"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/system/Surface";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

/**
 * Companion to EmptyState for failed queries — before this existed, API
 * failures silently rendered as empty lists. Same shell so the two read as one
 * family; no aurora here, because a failure should look sober, not inviting.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <Surface
      tone="subtle"
      className={cn("flex flex-col items-center justify-center gap-4 px-6 py-16 text-center", className)}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-1 ring-destructive/30 ring-inset">
        <AlertTriangle className="size-6" />
      </div>
      <div>
        <p className="font-heading text-base font-semibold tracking-tight">
          {title ?? t.common.somethingWentWrong}
        </p>
        {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" className="h-10 rounded-full px-5" onClick={onRetry}>
          <RotateCcw className="size-4" />
          {t.common.retry}
        </Button>
      )}
    </Surface>
  );
}
