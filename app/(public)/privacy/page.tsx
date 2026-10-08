"use client";

import { useEffect, useState, type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ChevronUpIcon } from "@/components/system/icons";
import { LanguageSwitch } from "@/components/system/LanguageSwitch";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { authText } from "@/lib/i18n/sections/auth";
import { cn } from "@/lib/utils";

/**
 * THE PRIVACY POLICY (H-16) — Privacy board.
 *
 * A DRAFT for the owner to review before it takes effect, written from what
 * the app really collects (phone, name, photo, payments, watch and reading
 * history, comments, feedback, searches, IP/device) — so it opens with a
 * notice saying so, and every sentence that needs the owner's decision is
 * marked [in brackets] (highlighted amber here). The text lives in the i18n
 * file like every other sentence on the site, so it reads in Burmese and
 * English alike; the "Read this policy in" switch is the site's language.
 *
 * Layout: a calm reading page — header, then a sticky "On this page" list
 * (desktop) beside a 720px article, and a contact panel at the end. The
 * shell adds the footer and the phone dock.
 */

/** Stable anchors for the 12 sections (#sec-collect, #sec-delete…). */
const SLUGS = [
  "who",
  "collect",
  "device",
  "use",
  "deposits",
  "access",
  "keep",
  "delete",
  "choices",
  "security",
  "children",
  "changes",
];
const sectionId = (index: number) => `sec-${SLUGS[index] ?? index + 1}`;

/** Amber highlight for the [owner to fill in] gaps. */
function withGaps(text: string): ReactNode[] {
  return text
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("[") ? (
        <span
          key={index}
          className="rounded-[4px] bg-pending/14 px-1 py-px text-pending [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
        >
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
}

/** A bullet opens with its label in bold white ("Payments: …") when it has one. */
function bulletParts(text: string): ReactNode[] {
  const lead = text.match(/^(.{2,70}?)(: | — )/);
  if (!lead || lead[1].includes("[")) return withGaps(text);
  return [
    <span key="lead" className="font-bold text-fg">
      {lead[0]}
    </span>,
    ...withGaps(text.slice(lead[0].length)),
  ];
}

export default function PrivacyPage() {
  const { t } = useLanguage();
  const a = useSection(authText);
  const p = t.privacy;
  const [active, setActive] = useState(0);

  // "On this page": the section being read is marked in the list. Watches
  // which heading crossed the upper third of the screen.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const nodes = p.sections
      .map((_, index) => document.getElementById(sectionId(index)))
      .filter((node): node is HTMLElement => node !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top);
        if (visible.length === 0) return;
        const index = nodes.indexOf(visible[0].target as HTMLElement);
        if (index >= 0) setActive(index);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [p.sections]);

  return (
    <div className="px-gutter pt-[clamp(40px,5vw,72px)]">
      <div className="mx-auto max-w-[1120px]">
        <header id="privacy-top" className="mq-rise max-w-[760px] scroll-mt-[calc(var(--shell-bar-h)+24px)]">
          <p className="text-kicker [:lang(my)_&]:text-sm [:lang(my)_&]:leading-[22px] [:lang(my)_&]:normal-case">
            {p.kicker}
          </p>
          <h1 className="text-title mt-3 text-fg">{p.title}</h1>
          <p className="mt-3 max-w-[60ch] text-[17px] leading-[27px] text-fg-muted">{p.subtitle}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="inline-flex h-8 items-center gap-2 rounded-full bg-raised px-3 text-[13px] leading-[18px] font-bold text-fg-body">
              <CalendarIcon />
              {p.lastUpdated}
            </span>
            <span className="text-[13px] leading-[18px] text-fg-faint">
              {a.sectionCount(p.sections.length)}
            </span>
            <span id="privacy-language" className="sr-only">
              {a.privacyLanguage}
            </span>
            <LanguageSwitch labelledBy="privacy-language" />
          </div>
        </header>

        <div className="mt-12 grid grid-cols-1 items-start gap-[clamp(32px,5vw,80px)] desk:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <nav
            aria-label={a.onThisPage}
            className="sticky top-[calc(var(--shell-bar-h)+32px)] max-desk:hidden"
          >
            <p className="text-kicker [:lang(my)_&]:text-sm [:lang(my)_&]:leading-[22px] [:lang(my)_&]:normal-case">
              {a.onThisPage}
            </p>
            <ol className="mt-3.5 list-none p-0 shadow-[inset_1px_0_0_var(--mq-hairline)]">
              {p.sections.map((section, index) => {
                const on = index === active;
                return (
                  <li key={section.heading}>
                    <a
                      href={`#${sectionId(index)}`}
                      aria-current={on ? "location" : undefined}
                      onClick={() => setActive(index)}
                      className={cn(
                        "block rounded-r-[6px] py-[7px] pl-4 text-sm leading-5 outline-none transition-colors duration-150 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link [:lang(my)_&]:leading-[22px]",
                        on
                          ? "font-extrabold text-fg shadow-[inset_3px_0_0_var(--mq-crimson)]"
                          : "font-semibold text-fg-muted",
                      )}
                    >
                      {section.heading}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>

          <article className="min-w-0 max-w-[720px]">
            <div role="note" className="flex items-start gap-3.5 rounded-[12px] bg-pending/10 px-[22px] py-5">
              <DraftIcon />
              <div className="min-w-0">
                <p className="text-base leading-[22px] font-extrabold text-fg">{p.draftTitle}</p>
                <p className="mt-1.5 text-[15px] leading-[23px] text-fg-body [:lang(my)_&]:leading-7">
                  {withGaps(p.draftBody)}
                </p>
              </div>
            </div>

            {p.sections.map((section, index) => (
              <section
                key={section.heading}
                id={sectionId(index)}
                aria-labelledby={`${sectionId(index)}-title`}
                className={cn(
                  "scroll-mt-[calc(var(--shell-bar-h)+24px)]",
                  index === 0 ? "mt-10" : "mt-12 pt-10 shadow-[inset_0_1px_0_var(--mq-hairline)]",
                )}
              >
                <span aria-hidden className="nums block text-[12px] leading-4 font-extrabold tracking-[0.12em] text-fg-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 id={`${sectionId(index)}-title`} className="text-section-title mt-1.5 text-fg">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-body mt-3.5 max-w-[68ch] text-fg-body">
                    {withGaps(paragraph)}
                  </p>
                ))}
                {section.bullets.length > 0 && (
                  <ul className="mt-3.5 list-disc pl-[22px] marker:text-fg-decor">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="text-body mt-2.5 pl-1 text-fg-body">
                        {bulletParts(bullet)}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <div className="mt-14 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-[12px] bg-surface p-6">
              <div className="min-w-0 max-w-[48ch]">
                <h2 className="text-section-title text-fg">{a.contactTitle}</h2>
                <p className="mt-1.5 text-[15px] leading-[23px] text-fg-muted [:lang(my)_&]:leading-7">
                  {withGaps(a.contactBody)}
                </p>
              </div>
              <a
                href="#privacy-top"
                className={cn(buttonVariants({ variant: "tonal", size: "cta" }), "px-5")}
              >
                <ChevronUpIcon size={18} />
                {a.backToTop}
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      className="shrink-0 text-fg-muted"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16M8.5 3v4M15.5 3v4" />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      className="mt-px shrink-0 text-pending"
    >
      <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
      <path d="M14 3.5v5h5" />
      <path d="M12 11.5v3.5M12 18h.01" />
    </svg>
  );
}
