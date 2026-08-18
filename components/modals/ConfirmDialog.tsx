"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

/**
 * The one "are you sure?" in the app. A destructive confirm leads with a red
 * disc so the weight of the question registers before the buttons do; the
 * neutral variant is the same dialog without the alarm.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = "default",
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-3xl p-5 ring-white/10 sm:max-w-md sm:p-6">
        <DialogHeader>
          {variant === "destructive" && (
            <div className="flex size-11 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-1 ring-destructive/30 ring-inset">
              <AlertTriangle className="size-5" />
            </div>
          )}
          <DialogTitle className="text-section-title">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0 pt-1">
          <Button
            variant="ghost"
            className="h-11 rounded-full px-5"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant={variant}
            className={cn(
              "h-11 rounded-full px-5",
              variant === "destructive" &&
                "bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90",
            )}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel ?? t.common.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
