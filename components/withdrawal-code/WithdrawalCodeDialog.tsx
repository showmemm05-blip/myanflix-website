"use client";

import { useState } from "react";
import { MoneyDialog } from "@/components/wallet/MoneyDialog";
import { WithdrawalCodeFlow } from "@/components/withdrawal-code/WithdrawalCodeFlow";
import type { WithdrawalCodeStatus } from "@/services/api/withdrawalCodeService";

/**
 * Settings › Withdrawal code: "Create code" when the account has none,
 * otherwise "Change code" (current → new → confirm), with "Forgot code?"
 * (SMS → new → confirm) on the current-code step. No withdrawal here — it
 * ends on a "done" note.
 *
 * Marquee (Settings.dc.html): the 480px money-dialog frame — kicker, "Step
 * N of M" and close on top, the crimson rail, then the code step; a bottom
 * sheet on phones.
 */
export function WithdrawalCodeDialog({
  open,
  onOpenChange,
  status,
  flowKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fresh from the server when the dialog opened; kept while it animates closed. */
  status: WithdrawalCodeStatus | null;
  /** Bumped on every opening so the steps start over. */
  flowKey: number;
}) {
  const [busy, setBusy] = useState(false);
  // Never yank the dialog out from under a request: its answer (a wrong
  // code, a lock, an expired SMS step) would land in a closed dialog.
  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    onOpenChange(next);
  };
  return (
    <MoneyDialog open={open} onOpenChange={handleOpenChange} size="sm">
      {status && (
        <WithdrawalCodeFlow
          key={flowKey}
          status={status}
          onBusyChange={setBusy}
          purpose={{ kind: "settings", onClose: () => onOpenChange(false) }}
        />
      )}
    </MoneyDialog>
  );
}
