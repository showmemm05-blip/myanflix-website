"use client";

import { Tag, type TagKind } from "@/components/system";
import { useLanguage } from "@/lib/context/language-context";

/** Every money surface shares these five states — one tag, one map. */
export type LedgerStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "FAILED";

/**
 * The boards' status tags (Wallet / Transactions): amber = waiting on
 * someone, green = approved, grey = done, red = it didn't go through.
 * Drawn with the shared <Tag> so a status in the wallet is the same object
 * as a status in the ledger or on the Deposit "submitted" screen.
 */
const KIND: Record<LedgerStatus, TagKind> = {
  PENDING: "pending",
  APPROVED: "approved",
  COMPLETED: "neutral",
  REJECTED: "rejected",
  FAILED: "rejected",
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
    <Tag kind={KIND[status]} className={className}>
      {label[status]}
    </Tag>
  );
}
