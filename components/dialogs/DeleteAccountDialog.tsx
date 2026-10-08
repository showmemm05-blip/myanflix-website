"use client";

import { useState } from "react";
import Link from "next/link";

import { Modal } from "@/components/system";
import { AlertCircleIcon, WalletIcon } from "@/components/system/icons";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { formatKyat } from "@/lib/currency";

/**
 * "Delete account" (H-16/H-25) — the one irreversible action on the site, so
 * it says exactly what happens and what it needs before it asks, and only
 * arms the button once the reader has ticked that they understand.
 *
 * The wallet check shown here is a heads-up from the profile's last known
 * balance; the server makes the real decision and its refusal (`error`) is
 * shown in place, in the reader's language.
 *
 * Marquee dialog frame (Settings board): centred on desktop, a bottom sheet
 * on phones; it cannot be dismissed while the deletion is running.
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

  const listClass = "mt-2.5 flex flex-col gap-2";
  const itemClass = "flex gap-2.5 text-sm leading-[21px] text-fg-body";
  const dot = <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-fg-decor" />;

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t.settings.deleteConfirmTitle}
      subtitle={t.settings.deleteConfirmDescription}
      dismissible={!isDeleting}
      className="desk:max-w-[min(600px,calc(100%-48px))]"
      bodyClassName="gap-[22px]"
      footer={
        <>
          <Button variant="tonal" size="cta" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            {t.common.cancel}
          </Button>
          <Button
            variant="danger"
            size="cta"
            onClick={onConfirm}
            disabled={!acknowledged}
            busy={isDeleting}
            busyLabel={t.settings.deleteConfirmButton}
          >
            {t.settings.deleteConfirmButton}
          </Button>
        </>
      }
    >
      <section>
        <h3 className="text-[15px] leading-5 font-extrabold text-fg">{t.settings.deleteEffectsTitle}</h3>
        <ul className={listClass}>
          {t.settings.deleteEffects.map((line) => (
            <li key={line} className={itemClass}>
              {dot}
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-[15px] leading-5 font-extrabold text-fg">{t.settings.deleteRequirementsTitle}</h3>
        <ul className={listClass}>
          {t.settings.deleteRequirements.map((line) => (
            <li key={line} className={itemClass}>
              {dot}
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {walletBalance > 0 && (
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-[12px] bg-pending/12 px-4 py-3.5 text-sm leading-[21px] text-pending tabular-nums"
        >
          <WalletIcon size={18} className="mt-0.5 shrink-0" />
          <span className="text-fg-body">
            {t.settings.deleteBalanceNotice(formatKyat(walletBalance))}{" "}
            <Link
              href="/wallet"
              className="mq-link rounded-[4px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
            >
              {t.wallet.withdraw}
            </Link>
          </span>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          disabled={isDeleting}
          className="focus-ring m-0 size-[22px] shrink-0 cursor-pointer accent-crimson"
        />
        <span className="text-[15px] leading-[22px] font-semibold text-fg">{t.settings.deleteAcknowledge}</span>
      </label>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[12px] bg-danger/10 px-3.5 py-3 text-sm leading-[21px] text-danger"
        >
          <AlertCircleIcon size={18} className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </Modal>
  );
}
