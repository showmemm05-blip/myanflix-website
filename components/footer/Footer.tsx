"use client";

import Link from "next/link";

import { Brand } from "@/components/shared/Brand";
import { useShellFeedback } from "@/components/layout/shell-context";
import { LanguageSwitch } from "@/components/system/LanguageSwitch";
import { PeopleIcon } from "@/components/system/icons";
import { useLanguage } from "@/lib/context/language-context";
import { usePeakUsers } from "@/lib/hooks/use-peak-users";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";

/**
 * THE QUIET FOOTER (SHELL.md §7) — on long, scrolling pages.
 *
 * One surface band (#121217): the wordmark and the site-wide peak-viewers
 * figure on the left; Privacy, Help & feedback (opens the shared feedback
 * dialog), the English | မြန်မာ switch and © on the right. The old browse/
 * account links live in the top bar and the account menu now, and the dead
 * Help centre / Contact / Terms / social links are gone (owner default).
 */
export function Footer() {
  const { t } = useLanguage();
  const s = useSection(shellText);
  const peak = usePeakUsers();
  const openFeedback = useShellFeedback();

  return (
    <footer className="mt-[clamp(56px,6vw,96px)] bg-surface px-gutter pt-8 pb-9">
      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
          <Brand size="sm" />
          {peak !== null && (
            <span className="flex items-center gap-2 text-[13px] leading-[18px] text-fg-muted tabular-nums">
              <PeopleIcon size={16} className="shrink-0 text-money" />
              {t.nav.peakViewers(peak.toLocaleString("en-US"))}
            </span>
          )}
        </div>
        <nav
          aria-label={s.footerNav}
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm leading-5 font-semibold"
        >
          <Link href="/privacy" className="rounded-[6px] text-fg-muted outline-none hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link">
            {s.privacy}
          </Link>
          <button
            type="button"
            onClick={openFeedback}
            className="cursor-pointer rounded-[6px] border-0 bg-transparent p-0 text-sm font-semibold text-fg-muted outline-none hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
          >
            {s.helpFeedback}
          </button>
          <LanguageSwitch />
          <span className="font-medium text-fg-faint">{s.copyright(new Date().getFullYear())}</span>
        </nav>
      </div>
    </footer>
  );
}
