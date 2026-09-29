"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Surface } from "@/components/system";
import { useLanguage } from "@/lib/context/language-context";
import { formatKyat } from "@/lib/currency";

// The dialog idioms this app already uses everywhere else — plus a height cap,
// because this one carries a whole list and must still fit a small phone.
const dialogContentClass =
  "max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-3xl p-5 ring-white/10 sm:max-w-md sm:p-6";
const dialogFooterClass = "mx-0 mb-0 border-0 bg-transparent p-0 pt-1";

/**
 * "Delete account" (H-16/H-25) — the one irreversible action on the site, so
 * it says exactly what happens and what it needs before it asks, and only
 * arms the button once the reader has ticked that they understand.
 *
 * The wallet check shown here is a heads-up from the profile's last known
 * balance; the server makes the real decision and its refusal (`error`) is
 * shown in place, in the reader's language.
 */
export function DeleteAccountDialog({
  open,
  onOpenChange,
  walletBalance,
  isDeleting,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalance: number;
  isDeleting: boolean;
  /** The server's refusal (or a failure), already translated. */
  error: string | null;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  const [acknowledged, setAcknowledged] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (isDeleting) return;
    // Every opening starts unticked — agreeing once is not agreeing forever.
    if (!next) setAcknowledged(false);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={dialogContentClass}>
        <DialogHeader>
          <div className="flex size-11 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-1 ring-destructive/30 ring-inset">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="text-section-title">{t.settings.deleteConfirmTitle}</DialogTitle>
          <DialogDescription>{t.settings.deleteConfirmDescription}</DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t.settings.deleteEffectsTitle}</h3>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground marker:text-muted-foreground/60">
            {t.settings.deleteEffects.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t.settings.deleteRequirementsTitle}</h3>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground marker:text-muted-foreground/60">
            {t.settings.deleteRequirements.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        {walletBalance > 0 && (
          <Surface
            tone="subtle"
            className="flex items-start gap-2.5 bg-premium/8 px-4 py-3 ring-premium/25"
          >
            <Wallet className="mt-0.5 size-4 shrink-0 text-premium" />
            <p className="text-xs text-foreground/90">
              {t.settings.deleteBalanceNotice(formatKyat(walletBalance))}
            </p>
          </Surface>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-1 text-sm text-foreground">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            disabled={isDeleting}
            className="focus-ring mt-0.5 size-4 shrink-0 cursor-pointer accent-destructive"
          />
          <span>{t.settings.deleteAcknowledge}</span>
        </label>

        {error && (
          <Surface
            role="alert"
            tone="subtle"
            className="flex items-start gap-2.5 bg-destructive/6 px-4 py-3 ring-destructive/25"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{error}</p>
          </Surface>
        )}

        <DialogFooter className={dialogFooterClass}>
          <DialogClose
            render={<Button variant="ghost" className="h-11 rounded-full px-5" />}
            disabled={isDeleting}
          >
            {t.common.cancel}
          </DialogClose>
          <Button
            variant="destructive"
            className="h-11 rounded-full bg-destructive px-5 text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={!acknowledged || isDeleting}
          >
            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {t.settings.deleteConfirmButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
