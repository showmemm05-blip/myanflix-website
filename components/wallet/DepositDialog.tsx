"use client";

import { useId } from "react";
import Link from "next/link";
import { AlertCircleIcon, InfoIcon, Tag } from "@/components/system";
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
import { MethodLogo, MethodTileGrid, type MethodTileOption } from "@/components/wallet/MethodTileGrid";
import { AmountField, QuickAmounts } from "@/components/wallet/AmountField";
import { ArrowBackIcon, BigCheckIcon, CopyIcon } from "@/components/wallet/icons";
import { onRadioKeyDown, radioTabIndex } from "@/components/wallet/radio-keys";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { walletText } from "@/lib/i18n/sections/wallet";
import { formatKyat } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { FinanceSettings } from "@/services/api/paymentService";
import type { PaymentAccount } from "@/types/payment-account";

export type DepositStep = 1 | 2 | 3;

export interface DepositDialogProps {
  financeSettings: FinanceSettings | undefined;
  depositOpen: boolean;
  onDepositOpenChange: (open: boolean) => void;
  /** Close without resetting the form (the Cancel button's historical behavior). */
  onCloseDeposit: () => void;
  /** 1 amount + method · 2 send the money + reference · 3 submitted. */
  depositStep: DepositStep;
  /** Step 1 → 2, after the amount and account checks. */
  onDepositContinue: () => void;
  /** Step 2 → 1 (Back / Change). */
  onDepositBack: () => void;
  amount: string;
  onAmountChange: (value: string) => void;
  /** Step 1's problem with the amount or the account (shown red). */
  amountError: string | null;
  isAccountsLoading: boolean;
  methodTypes: MethodTileOption[];
  effectiveType: string | null;
  onSelectType: (type: string) => void;
  accountsForType: PaymentAccount[];
  selectedAccount: PaymentAccount | null;
  onSelectAccount: (accountId: string) => void;
  copiedAccountId: string | null;
  onCopyAccountNumber: (accountId: string, accountNumber: string) => void;
  reference: string;
  onReferenceChange: (value: string) => void;
  referenceError: string | null;
  isDepositing: boolean;
  onSubmitDeposit: () => void;
}

/**
 * Deposit (Deposit.dc.html) — two steps with the crimson step bars:
 * 1. "Amount and method": the big amount field, the allowed range, quick
 *    amounts, the method tiles and the account to send to;
 * 2. "Send the money, then confirm": the amount with Change, the Send-to
 *    card with the large account number and Copy, the 6-digit reference;
 * then the "Deposit submitted" screen with a PENDING tag.
 */
export function DepositDialog(props: DepositDialogProps) {
  const { t } = useLanguage();
  const w = useSection(walletText);
  const uid = useId();
  const methodLabelId = `${uid}-method`;
  const accountLabelId = `${uid}-to`;
  const amountId = `${uid}-amount`;
  const referenceId = `${uid}-ref`;
  const step = props.depositStep;
  const amountNumber = Number(props.amount) || 0;
  const amountKs = formatKyat(amountNumber);
  const method = props.methodTypes.find((m) => m.type === props.effectiveType) ?? null;
  const methodName = method?.label ?? "";
  const account = props.selectedAccount;
  const noMethods = !props.isAccountsLoading && props.methodTypes.length === 0;
  const copied = account !== null && props.copiedAccountId === account.id;
  // An amount problem shows (and is announced) once, under the amount field;
  // only the "choose an account" problem, which isn't about the amount, goes
  // in the red alert above the buttons.
  const accountProblem = props.amountError !== null && props.amountError === t.wallet.errSelectAccount;
  const amountFieldError = accountProblem ? null : props.amountError;
  const accountIndex = account ? props.accountsForType.findIndex((a) => a.id === account.id) : -1;

  // A deposit on its way keeps the dialog open: its answer must land somewhere.
  const handleOpenChange = (open: boolean) => {
    if (!open && props.isDepositing) return;
    props.onDepositOpenChange(open);
  };

  const subtitle = step === 1 ? w.depositStep1 : step === 2 ? w.depositStep2 : w.requestSent;
  const logo = (size: number) =>
    method ? <MethodLogo logoUrl={method.logoUrl} label={method.label} isBank={method.isBank} size={size} /> : null;

  return (
    <MoneyDialog open={props.depositOpen} onOpenChange={handleOpenChange}>
      <MoneyDialogHeader title={w.depositFunds} subtitle={subtitle} closeDisabled={props.isDepositing} />
      {step !== 3 && <MoneyStepBars total={2} current={step} />}

      <MoneyDialogBody>
        {step === 1 && (
          <>
            <div>
              <AmountField
                id={amountId}
                label={w.amount}
                value={props.amount}
                onChange={props.onAmountChange}
                error={amountFieldError}
                help={
                  props.financeSettings
                    ? t.wallet.amountRange(
                        formatKyat(props.financeSettings.minDepositAmount),
                        formatKyat(props.financeSettings.maxDepositAmount),
                      )
                    : null
                }
              />
              <QuickAmounts label={w.quickAmounts} value={props.amount} onSelect={props.onAmountChange} />
            </div>

            <div>
              <span id={methodLabelId} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
                {t.wallet.paymentMethodLabel}
              </span>
              {props.isAccountsLoading ? (
                <>
                  <div aria-hidden className="mt-2.5 grid grid-cols-4 gap-2 max-desk:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i} className="mq-skeleton h-[92px] rounded-[12px]" />
                    ))}
                  </div>
                  <p role="status" className="sr-only">
                    {w.loadingMethods}
                  </p>
                </>
              ) : noMethods ? (
                <p className="mt-2.5 flex items-start gap-2.5 rounded-[12px] bg-raised px-4 py-3.5 text-[14px] leading-5 text-fg-body">
                  <InfoIcon size={18} className="mt-px shrink-0 text-fg-faint" />
                  <span>
                    {t.wallet.noPaymentMethods} {w.tryLater}
                  </span>
                </p>
              ) : (
                <MethodTileGrid
                  methods={props.methodTypes}
                  selected={props.effectiveType}
                  onSelect={props.onSelectType}
                  labelledBy={methodLabelId}
                />
              )}
            </div>

            {props.accountsForType.length > 0 && (
              <div>
                <span id={accountLabelId} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
                  {t.wallet.chooseAccountLabel}
                </span>
                <div role="radiogroup" aria-labelledby={accountLabelId} className="mt-2.5 flex flex-col gap-2">
                  {props.accountsForType.map((option, index) => {
                    const on = account?.id === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        tabIndex={radioTabIndex(index, accountIndex)}
                        onClick={() => props.onSelectAccount(option.id)}
                        onKeyDown={(e) =>
                          onRadioKeyDown(e, index, props.accountsForType.length, (i) =>
                            props.onSelectAccount(props.accountsForType[i].id),
                          )
                        }
                        className={cn(
                          "flex min-h-[68px] w-full items-center gap-3.5 rounded-[12px] py-3 pr-4 pl-3 text-left text-fg outline-none transition-[filter,background-color,box-shadow] duration-150",
                          "hover:brightness-[1.18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
                          on ? "bg-crimson/10 shadow-[inset_0_0_0_2px_var(--mq-crimson)]" : "bg-raised",
                        )}
                      >
                        {logo(40)}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] leading-[22px] font-bold">
                            {option.accountName}
                          </span>
                          <span className="block text-[13px] leading-[18px] text-fg-muted nums">
                            {option.accountNumber}
                            {option.bankName ? ` · ${option.bankName}` : ""}
                          </span>
                          {option.note && (
                            <span className="mt-0.5 block text-[12px] leading-4 text-fg-faint">{option.note}</span>
                          )}
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-[22px] shrink-0 items-center justify-center rounded-full",
                            on ? "bg-crimson" : "shadow-[inset_0_0_0_2px_var(--mq-tonal-hover)]",
                          )}
                        >
                          {on && <span className="size-2 rounded-full bg-fg" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="flex items-start gap-2.5 text-[13px] leading-5 text-fg-muted">
              <InfoIcon size={18} className="mt-px shrink-0 text-fg-faint" />
              <span>{w.nextStepNote}</span>
            </p>
          </>
        )}

        {step === 2 && !account && (
          <p className="flex items-start gap-2.5 rounded-[12px] bg-raised px-4 py-3.5 text-[14px] leading-5 text-fg-body">
            <InfoIcon size={18} className="mt-px shrink-0 text-fg-faint" />
            <span>
              {t.wallet.noPaymentMethods} {w.tryLater}
            </span>
          </p>
        )}

        {step === 2 && account && (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[13px] leading-[18px] font-bold text-fg-muted">{w.amount}</p>
                <p className="mt-0.5 flex items-baseline gap-2 nums">
                  <span className="text-[40px] leading-[46px] font-black tracking-[-0.03em] max-desk:text-[34px]">
                    {amountNumber.toLocaleString("en-US")}
                  </span>
                  <span className="text-[18px] leading-6 font-extrabold text-fg-faint">Ks</span>
                </p>
              </div>
              <button
                type="button"
                onClick={props.onDepositBack}
                disabled={props.isDepositing}
                aria-label={w.changeAmountOrMethod}
                className="mq-link h-10 rounded-md px-1 text-[15px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-40"
              >
                {w.change}
              </button>
            </div>

            <section aria-labelledby={`${uid}-sendto`} className="rounded-[16px] bg-raised p-5 max-desk:p-4">
              <div className="flex items-center gap-3.5">
                {logo(48)}
                <div className="min-w-0">
                  <h3 id={`${uid}-sendto`} className="text-[17px] leading-6 font-extrabold text-fg">
                    {w.sendToMethod(methodName)}
                  </h3>
                  <p className="text-[13px] leading-[18px] text-fg-muted">{account.accountName}</p>
                </div>
              </div>
              <p className="mt-[18px] text-[13px] leading-[18px] text-fg-faint">{w.accountNumber}</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
                <span className="text-[30px] leading-9 font-black tracking-[-0.01em] break-all select-all nums max-desk:text-[26px]">
                  {account.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => props.onCopyAccountNumber(account.id, account.accountNumber)}
                  aria-label={copied ? w.copiedStatus : t.wallet.copyNumber}
                  className={cn(
                    "mq-press inline-flex h-10 items-center gap-2 rounded-full pr-4 pl-3 text-[14px] font-extrabold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
                    copied ? "bg-money/16 text-money" : "bg-tonal text-fg",
                  )}
                >
                  {copied ? <BigCheckIcon size={18} /> : <CopyIcon size={18} />}
                  {copied ? t.wallet.copied : w.copy}
                </button>
              </div>
              <p role="status" aria-live="polite" className="mt-1.5 min-h-[18px] text-[13px] leading-[18px] font-bold text-money">
                {copied ? w.copiedStatus : ""}
              </p>
              {account.bankName && (
                <p className="mt-1.5 text-[13px] leading-5 text-fg-muted">
                  {t.wallet.bankNameLabel}: <span className="font-bold text-fg">{account.bankName}</span>
                </p>
              )}
              {account.note && <p className="mt-1.5 text-[13px] leading-5 text-fg-muted">{account.note}</p>}
              <p className="mt-1.5 text-[13px] leading-5 text-fg-muted nums">{w.sendExactly(amountKs, methodName)}</p>
            </section>

            <div>
              <label htmlFor={referenceId} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
                {t.wallet.referenceLabel}
              </label>
              <input
                id={referenceId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                autoFocus
                placeholder="000123"
                value={props.reference}
                onChange={(e) => props.onReferenceChange(e.target.value)}
                aria-describedby={`${referenceId}-help`}
                aria-invalid={props.referenceError ? true : undefined}
                className="mt-2 block h-14 w-full rounded-[12px] border-0 bg-raised px-[18px] text-[24px] leading-8 font-extrabold tracking-[0.24em] text-fg outline-none nums placeholder:text-fg-decor focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)] aria-invalid:shadow-[inset_0_0_0_1.5px_var(--mq-danger)]"
              />
              <p
                id={`${referenceId}-help`}
                role={props.referenceError ? "alert" : undefined}
                className={cn(
                  "mt-2 flex items-start gap-1.5 text-[13px] leading-[18px]",
                  props.referenceError ? "text-danger" : "text-fg-faint",
                )}
              >
                {props.referenceError && <AlertCircleIcon size={16} className="mt-px shrink-0" />}
                <span>{props.referenceError ?? w.referenceHelp(methodName)}</span>
              </p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <MoneySuccess
              icon={<BigCheckIcon size={40} />}
              title={w.depositSubmittedTitle}
              body={w.depositSubmittedBody}
            />
            <MoneySummaryList
              rows={[
                { label: w.amount, value: `+${amountKs}`, valueClassName: "font-extrabold text-money" },
                { label: t.wallet.paymentMethodLabel, value: methodName },
                { label: w.sentTo, value: account?.accountNumber ?? "" },
                { label: w.reference, value: props.reference, valueClassName: "tracking-[0.12em]" },
                { label: w.status, value: <Tag kind="pending">{t.status.pending}</Tag> },
              ]}
            />
          </>
        )}
      </MoneyDialogBody>

      {step === 1 && (
        <MoneyDialogFooter
          alert={
            accountProblem ? (
              <MoneyAlert icon={<AlertCircleIcon size={18} className="shrink-0" />}>{props.amountError}</MoneyAlert>
            ) : null
          }
        >
          <Button variant="tonal" size="cta" className="px-5" onClick={props.onCloseDeposit}>
            {t.common.cancel}
          </Button>
          <Button
            variant="commit"
            size="cta"
            onClick={props.onDepositContinue}
            disabled={props.isAccountsLoading || noMethods || amountNumber <= 0 || !account}
          >
            {w.continue}
          </Button>
        </MoneyDialogFooter>
      )}
      {step === 2 && (
        <MoneyDialogFooter>
          <Button
            variant="tonal"
            size="cta"
            className="px-5"
            onClick={props.onDepositBack}
            disabled={props.isDepositing}
          >
            <ArrowBackIcon size={18} />
            {t.common.back}
          </Button>
          <Button
            variant="commit"
            size="cta"
            className="min-w-[168px] nums"
            onClick={props.onSubmitDeposit}
            disabled={amountNumber <= 0 || !account}
            busy={props.isDepositing}
            busyLabel={w.submittingDeposit}
          >
            {t.wallet.submitDeposit(amountKs)}
          </Button>
        </MoneyDialogFooter>
      )}
      {step === 3 && (
        <MoneyDialogFooter>
          <Link
            href="/transactions"
            onClick={() => props.onDepositOpenChange(false)}
            className={buttonVariants({ variant: "tonal", size: "cta", className: "px-5" })}
          >
            {w.viewHistory}
          </Link>
          <Button variant="play" size="cta" onClick={() => props.onDepositOpenChange(false)} autoFocus>
            {t.withdrawalCode.done}
          </Button>
        </MoneyDialogFooter>
      )}
    </MoneyDialog>
  );
}
