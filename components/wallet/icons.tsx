import type { SVGProps } from "react";

/**
 * The money boards' own icon paths (Wallet / Deposit / Withdraw /
 * Transactions / Subscribe .dc.html) that the shared icon set doesn't carry.
 * Same contract as components/system/icons: 24×24, round caps, aria-hidden.
 */
type Props = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function make(d: string, defaultStroke = 1.75) {
  function MoneyIcon({ size = 20, strokeWidth = defaultStroke, ...props }: Props) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable={false}
        {...props}
      >
        <path d={d} />
      </svg>
    );
  }
  return MoneyIcon;
}

export const ArrowDownIcon = make("M12 4.5v14M6 12.5l6 6 6-6", 2);
export const ArrowUpIcon = make("M12 19.5v-14M6 11.5l6-6 6 6", 2);
export const ClockIcon = make("M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 7.5V12l3 2", 2);
export const RefundIcon = make("M9 14l-5-5 5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11");
export const FilmIcon = make("M4 5h16v14H4zM8 5v14M16 5v14M4 9.5h4M16 9.5h4M4 14.5h4M16 14.5h4");
export const CrownOutlineIcon = make("M3 18h18l1-11-5.5 4L12 4 7.5 11 2 7z");
export const WalletLineIcon = make(
  "M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5zM15 12h2.5",
);
export const ReceiptLineIcon = make(
  "M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5zM9 8h6M9 12h6",
);
export const EyeIcon = make("M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z");
export const EyeOffIcon = make(
  "M3 3l18 18M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.5 7.6C4 9.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2",
);
export const ShieldIcon = make("M12 3.5l7 2.8v5.2c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6.3z");
export const TimerIcon = make("M12 4.5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8.5v4l2.5 1.5M9.5 2.5h5");
export const TrendUpIcon = make("M4 16.5l5.5-5.5 4 4L20 8.5M14.5 8.5H20V14");
export const TrendDownIcon = make("M4 7.5l5.5 5.5 4-4 6.5 6.5M14.5 15.5H20V10");
export const CopyIcon = make(
  "M10 8.5h8.5a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H10a1.5 1.5 0 0 1-1.5-1.5V10A1.5 1.5 0 0 1 10 8.5zM15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 6v8.5A1.5 1.5 0 0 0 5.5 16h3",
);
export const RetryIcon = make("M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4");
export const BankIcon = make("M3.5 9.5L12 4l8.5 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3.5 20h17");
export const MessageIcon = make("M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5zM8 10h8M8 13h5");
export const ArrowBackIcon = make("M15 6l-6 6 6 6", 2);
export const BigCheckIcon = make("M5 12.5l4.5 4.5L19 7.5", 2);

/** The shield with a small lock, used on the code step disc. */
export function ShieldLockIcon({ size = 28, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...props}
    >
      <path d="M12 3.5l7 2.8v5.2c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6.3z" />
      <rect x="9.25" y="11" width="5.5" height="4.5" rx="1" />
      <path d="M10.5 11V9.8a1.5 1.5 0 0 1 3 0V11" />
    </svg>
  );
}
