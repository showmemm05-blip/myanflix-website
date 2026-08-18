"use client";

import { Chip, type ChipTone } from "@/components/system/Chip";
import { useLanguage } from "@/lib/context/language-context";

/** Every money surface shares these five states — one chip, one map. */
export type LedgerStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "FAILED";

/**
 * The semantic role of each state, in the system's colors: amber = waiting on
 * someone, emerald = money landed, red = it didn't. Rendered through the shared
 * <Chip> so a status pill in the wallet is the same object as a status pill in
 * the ledger or the deposit history.
 */
const TONE: Record<LedgerStatus, ChipTone> = {
  PENDING: "warning",
  APPROVED: "success",
  COMPLETED: "success",
  REJECTED: "destructive",
  FAILED: "destructive",
};

export function StatusChip({ status, className }: { status: LedgerStatus; className?: string }) {
  const { t } = useLanguage();
  const label: Record<LedgerStatus, string> = {
    PENDING: t.status.pending,
    APPROVED: t.status.approved,
    REJECTED: t.status.rejected,
    COMPLETED: t.status.completed,
    FAILED: t.status.failed,
  };
  return (
    <Chip tone={TONE[status]} variant="outline" size="sm" className={className}>
      {label[status]}
    </Chip>
  );
}
