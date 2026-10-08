"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon, InfoIcon, Tag, fieldClass } from "@/components/system";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  MoneyAlert,
  MoneyDialog,
  MoneyDialogBody,
  MoneyDialogFooter,
  MoneyDialogHeader,
  MoneyStepBars,
  MoneySuccess,
  MoneySummaryList,
} from "@/components/wallet/MoneyDialog";
import { MethodLogo, MethodTileGrid } from "@/components/wallet/MethodTileGrid";
import { AmountField, QuickAmounts } from "@/components/wallet/AmountField";
import { BigCheckIcon, WalletLineIcon } from "@/components/wallet/icons";
import { WithdrawalCodeFlow } from "@/components/withdrawal-code/WithdrawalCodeFlow";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { walletText } from "@/lib/i18n/sections/wallet";
import { formatKyat } from "@/lib/currency";
import type { FinanceSettings } from "@/services/api/paymentService";
import type { WithdrawalCodeStatus } from "@/services/api/withdrawalCodeService";
import type { PaymentAccountType } from "@/types/payment-account";

/** What the "Withdrawal requested" screen shows, kept from the moment it went through. */
export interface WithdrawResult {
  amount: number;
  destinationLabel: string;
  accountNumber: string;
  balanceAfter: number;
}

export interface WithdrawDialogProps {
  paymentAccountTypes: PaymentAccountType[] | undefined;
  financeSettings: FinanceSettings | undefined;
  withdrawOpen: boolean;
  onWithdrawOpenChange: (open: boolean) => void;
  /** Close without resetting the form (the Cancel button's historical behavior). */
  onCloseWithdraw: () => void;
  withdrawAmount: string;
  onWithdrawAmountChange: (value: string) => void;
  withdrawAmountNumber: number;
  availableBalance: number;
  withdrawAccountType: string | null;
  onSelectWithdrawType: (type: string) => void;
  withdrawRequiresBankName: boolean;
  withdrawBankName: string;
  onWithdrawBankNameChange: (value: string) => void;
  withdrawAccountName: string;
  onWithdrawAccountNameChange: (value: string) => void;
  withdrawAccountNumber: string;
  onWithdrawAccountNumberChange: (value: string) => void;
  withdrawError: string | null;
  isWithdrawing: boolean;
  /** Checks the form, then moves the dialog on to the withdrawal-code steps. */
  onSubmitWithdraw: () => void;

  // Withdrawal code — the same dialog's second phase; "done" is the requested screen.
  withdrawPhase: "form" | "code" | "done";
  /** Fresh from the server when the code phase opened; null in the form phase. */
  withdrawCodeStatus: WithdrawalCodeStatus | null;
  /** Remounts the code steps fresh on every entry. */
  withdrawCodeKey: number;
  /** "KBZPay — Kyaw Zin" */
  withdrawDestinationLabel: string;
  /** Requests the withdrawal with this code; rejects with the server's refusal. */
  onSubmitWithdrawalCode: (code: string) => Promise<void>;
  /** Back from the code steps to the form, nothing sent. */
  onWithdrawCodeBack: () => void;
  /** The withdrawal was refused for a reason that isn't the code. */
  onWithdrawCodeFailed: (err: unknown) => void;
  /**
   * The form is back from the code steps (Back, or a refusal about the
   * form): its first field takes the focus, which would otherwise fall out
   * of the dialog with the code step's buttons. False on a fresh opening,
   * where the dialog places the focus itself.
   */
  withdrawFormFocus: boolean;
  /** Set once the withdrawal went through (the "done" phase). */
  withdrawResult: WithdrawResult | null;
}

/**
 * Withdraw (Withdraw.dc.html): the form first ("Amount and account"); once
 * it passes its checks the same dialog moves on to the withdrawal code
 * (create one, or enter it), whose last step requests the withdrawal; then
 * the "Withdrawal requested" screen with the new balance.
 */
export function WithdrawDialog(props: WithdrawDialogProps) {
  // A code-step request on its way (create, Forgot code, the withdrawal).
  const [codeBusy, setCodeBusy] = useState(false);
  // Never yank the dialog out from under a request: its answer — a wrong
  // code, a lock — would land in a closed dialog and the user would see nothing.
  const handleOpenChange = (open: boolean) => {
    if (!open && (codeBusy || props.isWithdrawing)) return;
    props.onWithdrawOpenChange(open);
  };
  const type = props.paymentAccountTypes?.find((x) => x.value === props.withdrawAccountType) ?? null;
  return (
    <MoneyDialog open={props.withdrawOpen} onOpenChange={handleOpenChange}>
      {props.withdrawPhase === "code" && props.withdrawCodeStatus ? (
        <WithdrawalCodeFlow
          key={props.withdrawCodeKey}
          status={props.withdrawCodeStatus}
          onBusyChange={setCodeBusy}
          purpose={{
            kind: "withdraw",
            amountLabel: formatKyat(props.withdrawAmountNumber),
            destinationLabel: props.withdrawDestinationLabel,
            accountNumber: props.withdrawAccountNumber.trim(),
            destinationLogo: (
              <MethodLogo
                logoUrl={type?.logoUrl}
                label={type?.label ?? props.withdrawAccountType ?? ""}
                isBank={type?.requiresBankName}
              />
            ),
            submit: props.onSubmitWithdrawalCode,
            onBack: props.onWithdrawCodeBack,
            onFailed: props.onWithdrawCodeFailed,
          }}
        />
      ) : props.withdrawPhase === "done" && props.withdrawResult ? (
        <WithdrawDone result={props.withdrawResult} onClose={() => props.onWithdrawOpenChange(false)} />
      ) : (
        <WithdrawForm {...props} />
      )}
    </MoneyDialog>
  );
}

/** The withdrawal form — the dialog's first phase. */
function WithdrawForm(props: WithdrawDialogProps) {
  const { t } = useLanguage();
  const w = useSection(walletText);
  const uid = useId();
  const typeLabelId = `${uid}-type`;
  const amountKs = formatKyat(props.withdrawAmountNumber);
  const hasDestination = Boolean(props.withdrawAccountType && props.withdrawAccountName.trim());
  return (
    <>
      <MoneyDialogHeader title={w.withdrawFunds} subtitle={w.withdrawStep1} closeDisabled={props.isWithdrawing} />
      <MoneyStepBars total={2} current={1} />
      <MoneyDialogBody>
        <p className="flex items-center gap-2 text-[14px] leading-5 font-semibold text-fg-body nums">
          <WalletLineIcon size={18} className="text-money" />
          {t.wallet.availableBalance(formatKyat(props.availableBalance))}
        </p>

        <div>
          <AmountField
            id={`${uid}-amount`}
            label={w.amount}
            autoFocus={props.withdrawFormFocus}
            value={props.withdrawAmount}
            onChange={props.onWithdrawAmountChange}
            help={
              props.financeSettings
                ? t.wallet.amountRangeWithdraw(
                    formatKyat(props.financeSettings.minWithdrawalAmount),
                    formatKyat(props.financeSettings.maxWithdrawalAmount),
                  )
                : null
            }
          />
          <QuickAmounts label={w.quickAmounts} value={props.withdrawAmount} onSelect={props.onWithdrawAmountChange} />
        </div>

        <div>
          <span id={typeLabelId} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
            {t.wallet.accountTypeLabel}
          </span>
          <MethodTileGrid
            columns={5}
            labelledBy={typeLabelId}
            methods={(props.paymentAccountTypes ?? []).map((x) => ({
              type: x.value,
              label: x.label,
              logoUrl: x.logoUrl,
              isBank: x.requiresBankName,
            }))}
            selected={props.withdrawAccountType}
            onSelect={props.onSelectWithdrawType}
          />
        </div>

        {props.withdrawRequiresBankName && (
          <div className="mq-rise">
            <label htmlFor={`${uid}-bank`} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
              {t.wallet.bankNameLabel}
            </label>
            <input
              id={`${uid}-bank`}
              type="text"
              autoComplete="off"
              placeholder={t.wallet.bankNamePlaceholder}
              value={props.withdrawBankName}
              onChange={(e) => props.onWithdrawBankNameChange(e.target.value)}
              className={`${fieldClass()} mt-2`}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mq-stack">
          <div>
            <label htmlFor={`${uid}-name`} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
              {t.wallet.accountNameLabel}
            </label>
            <input
              id={`${uid}-name`}
              type="text"
              autoComplete="name"
              placeholder={t.wallet.accountNamePlaceholder}
              value={props.withdrawAccountName}
              onChange={(e) => props.onWithdrawAccountNameChange(e.target.value)}
              className={`${fieldClass()} mt-2`}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-number`} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
              {t.wallet.accountNumberLabel}
            </label>
            <input
              id={`${uid}-number`}
              type="text"
              inputMode="tel"
              autoComplete="off"
              placeholder={t.wallet.accountNumberPlaceholder}
              value={props.withdrawAccountNumber}
              onChange={(e) => props.onWithdrawAccountNumberChange(e.target.value)}
              className={`${fieldClass()} mt-2 nums`}
            />
          </div>
        </div>

        <p className="flex items-start gap-2.5 rounded-[12px] bg-raised px-4 py-3.5 text-[14px] leading-5 text-fg-body nums">
          <InfoIcon size={18} className="mt-px shrink-0 text-fg-faint" />
          <span>
            {hasDestination
              ? w.withdrawSummaryTo(amountKs, props.withdrawDestinationLabel)
              : t.wallet.withdrawSummary(amountKs)}
          </span>
        </p>
      </MoneyDialogBody>

      <MoneyDialogFooter
        alert={
          props.withdrawError ? (
            <MoneyAlert icon={<AlertCircleIcon size={18} className="shrink-0" />}>{props.withdrawError}</MoneyAlert>
          ) : null
        }
      >
        <Button
          variant="tonal"
          size="cta"
          className="px-5"
          onClick={props.onCloseWithdraw}
          disabled={props.isWithdrawing}
        >
          {t.common.cancel}
        </Button>
        <Button
          variant="commit"
          size="cta"
          className="min-w-[168px]"
          onClick={props.onSubmitWithdraw}
          busy={props.isWithdrawing}
          busyLabel={w.sendingRequest}
          disabled={
            props.withdrawAmountNumber <= 0 ||
            !props.withdrawAccountType ||
            !props.withdrawAccountName.trim() ||
            !props.withdrawAccountNumber.trim() ||
            (props.withdrawRequiresBankName && !props.withdrawBankName.trim())
          }
        >
          {t.wallet.submitWithdraw}
        </Button>
      </MoneyDialogFooter>
    </>
  );
}

/** "Withdrawal requested" — the amount, where it goes, the new balance, PENDING. */
function WithdrawDone({ result, onClose }: { result: WithdrawResult; onClose: () => void }) {
  const { t } = useLanguage();
  const w = useSection(walletText);
  return (
    <>
      <MoneyDialogHeader title={w.withdrawFunds} subtitle={w.requestSent} />
      <MoneyDialogBody>
        <MoneySuccess icon={<BigCheckIcon size={40} />} title={w.withdrawRequestedTitle} body={w.withdrawRequestedBody} />
        <MoneySummaryList
          rows={[
            { label: w.amount, value: `−${formatKyat(result.amount)}`, valueClassName: "font-extrabold" },
            { label: w.receivingAccount, value: result.destinationLabel },
            { label: w.accountNumber, value: result.accountNumber },
            {
              label: w.balanceNow,
              value: formatKyat(result.balanceAfter),
              valueClassName: "font-extrabold text-money",
            },
            { label: w.status, value: <Tag kind="pending">{t.status.pending}</Tag> },
          ]}
        />
      </MoneyDialogBody>
      <MoneyDialogFooter>
        <Link
          href="/transactions"
          onClick={onClose}
          className={buttonVariants({ variant: "tonal", size: "cta", className: "px-5" })}
        >
          {w.viewHistory}
        </Link>
        <Button variant="play" size="cta" onClick={onClose} autoFocus>
          {t.withdrawalCode.done}
        </Button>
      </MoneyDialogFooter>
    </>
  );
}
