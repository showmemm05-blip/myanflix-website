"use client";

import { useId, type ReactNode } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { PersonDisc } from "@/components/cards";
import { CrownIcon, Row } from "@/components/system";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { titlesText } from "@/lib/i18n/sections/titles";
import { cn } from "@/lib/utils";

/**
 * The two-column body under a title hero: the main column (comments,
 * episodes, chapters) on the left, a sticky side panel on the right. Under
 * 720px it stacks with the side panel FIRST (the boards' `.side` rule), and
 * the panel stops sticking.
 */
export function DetailColumns({
  asideLabel,
  aside,
  children,
  className,
}: {
  asideLabel: string;
  aside: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid items-start gap-x-[clamp(32px,5vw,80px)] gap-y-10 px-gutter desk:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]",
        className,
      )}
    >
      <aside
        aria-label={asideLabel}
        className="flex flex-col gap-4 desk:sticky desk:top-[calc(var(--shell-bar-h)+24px)] desk:col-start-2 desk:row-start-1"
      >
        {aside}
      </aside>
      <div className="min-w-0 desk:col-start-1 desk:row-start-1">{children}</div>
    </div>
  );
}

export interface DetailFact {
  label: string;
  value: string;
  tone?: "gold" | "money";
}

/** "DETAILS" — label left, value right, hairline between rows. */
export function DetailsPanel({ facts }: { facts: DetailFact[] }) {
  const { t } = useLanguage();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-[16px] bg-surface px-6 pt-5 pb-2">
      <h2 id={headingId} className="mb-1 text-label font-extrabold tracking-[0.1em] text-fg-faint uppercase [&:lang(my)]:tracking-normal">
        {t.movieDetail.details}
      </h2>
      <dl className="m-0">
        {facts.map((fact, i) => (
          <div
            key={fact.label}
            className={cn("flex items-start justify-between gap-4 py-3", i > 0 && "shadow-[inset_0_1px_0_var(--mq-hairline)]")}
          >
            <dt className="shrink-0 text-sm leading-5 text-fg-faint">{fact.label}</dt>
            <dd
              className={cn(
                "m-0 min-w-0 text-right text-sm leading-5 font-bold text-fg tabular-nums [overflow-wrap:anywhere]",
                fact.tone === "gold" && "text-gold",
                fact.tone === "money" && "text-money",
              )}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The gold "Included with Premium" card a signed-in non-subscriber sees beside a Premium title. */
export function UpsellPanel({ title, onSeePlans }: { title: string; onSeePlans: () => void }) {
  const s = useSection(titlesText);
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-[16px] bg-surface px-6 pt-[22px] pb-6">
      <span aria-hidden className="flex size-10 items-center justify-center rounded-[12px] bg-gold/16 text-gold">
        <CrownIcon size={20} />
      </span>
      <h2 id={headingId} className="mt-3.5 text-lg leading-6 font-extrabold text-fg">
        {s.upsellTitle}
      </h2>
      <p className="mt-1.5 text-sm leading-[21px] text-fg-muted">{s.upsellBody(title)}</p>
      <Button variant="gold" size="cta" aria-haspopup="dialog" className="mt-[18px] w-full" onClick={onSeePlans}>
        <CrownIcon size={16} />
        {s.seePlans}
      </Button>
    </section>
  );
}

export interface CastPerson {
  key: string;
  name: string;
  role: string;
  imageUrl: string | null;
  href: string;
}

/** "Cast & crew" — a rail of person discs (photo or initials). Renders nothing for an empty cast. */
export function CastRow({ title, subtitle, people }: { title: string; subtitle?: string; people: CastPerson[] }) {
  if (people.length === 0) return null;
  return (
    <Row title={title} subtitle={subtitle} railClassName="gap-[clamp(16px,1.6vw,24px)] pt-[18px]">
      {people.map((person) => (
        <PersonDisc
          key={person.key}
          name={person.name}
          role={person.role}
          imageUrl={person.imageUrl}
          href={person.href}
          className="w-[clamp(96px,8.4vw,124px)]"
        />
      ))}
    </Row>
  );
}

/** The two square tiles above a series' details (Seasons · Episodes). */
export function CountTiles({ tiles }: { tiles: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-[16px] bg-surface px-5 py-[18px]">
          <div className="text-[32px] leading-9 font-black tracking-[-0.02em] text-fg tabular-nums">{tile.value}</div>
          <div className="mt-1 text-sm leading-5 text-fg-faint">{tile.label}</div>
        </div>
      ))}
    </div>
  );
}

/** The not-found screen: grey disc, an h1, one line, a white way back. */
export function TitleNotFound({
  icon,
  title,
  body,
  backHref,
  backLabel,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <section className="flex flex-col items-center px-gutter pt-[clamp(80px,10vw,140px)] pb-10 text-center">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-tonal-faint text-fg-muted">
        {icon}
      </span>
      <h1 className="mt-[18px] text-section-title text-fg">{title}</h1>
      <p className="mt-1.5 max-w-[380px] text-[15px] leading-[23px] text-fg-muted">{body}</p>
      <Link href={backHref} className={cn(buttonVariants({ variant: "play", size: "cta" }), "mt-5")}>
        {backLabel}
      </Link>
    </section>
  );
}

/**
 * The loading screen of a title page: the hero copy's shape (kicker, title,
 * meta, three synopsis lines, the button row) and one skeleton row — or, for
 * a book, the cover beside it and a list of chapter rows.
 */
export function TitleSkeleton({ kind, label }: { kind: "title" | "book"; label: string }) {
  const copy = (
    <div className="flex max-w-[680px] flex-1 flex-col gap-3.5">
      <span className="mq-skeleton block h-[22px] w-[140px] rounded-[6px]" />
      <span className="mq-skeleton block h-14 w-[70%] rounded-[10px]" />
      <span className="mq-skeleton block h-[18px] w-[44%] rounded-[6px]" />
      <span className="mq-skeleton mt-2 block h-4 w-full rounded-[6px]" />
      <span className="mq-skeleton block h-4 w-[92%] rounded-[6px]" />
      <span className="mq-skeleton block h-4 w-[60%] rounded-[6px]" />
      <div className="mt-3.5 flex gap-3">
        <span className="mq-skeleton block h-[52px] w-40 rounded-[12px]" />
        <span className="mq-skeleton block h-[52px] w-[132px] rounded-[12px]" />
        <span className="mq-skeleton block size-[52px] rounded-[12px]" />
      </div>
    </div>
  );

  return (
    <div aria-busy="true" className="px-gutter pt-[clamp(96px,10vw,160px)]">
      <p role="status" className="sr-only">
        {label}
      </p>
      {kind === "book" ? (
        <>
          <div className="grid items-end gap-x-[clamp(24px,3.4vw,56px)] gap-y-7 desk:grid-cols-[auto_minmax(0,1fr)]">
            <span className="mq-skeleton block aspect-[5/7] w-[clamp(132px,38vw,168px)] rounded-[4px_14px_14px_4px] desk:w-[clamp(168px,16vw,232px)]" />
            {copy}
          </div>
          <div className="mt-16 flex max-w-[900px] flex-col gap-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="mq-skeleton block h-[88px] rounded-[16px]" />
            ))}
          </div>
        </>
      ) : (
        <>
          {copy}
          <span className="mq-skeleton mt-[72px] block h-[22px] w-[180px] rounded-[6px]" />
          <div className="mt-[18px] flex gap-4 overflow-hidden">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="w-[clamp(128px,12.2vw,184px)] shrink-0">
                <span className="mq-skeleton block aspect-[2/3] rounded-[10px]" />
                <span className="mq-skeleton mt-3 block h-3.5 w-[80%] rounded-[5px]" />
                <span className="mq-skeleton mt-2 block h-3 w-1/2 rounded-[5px]" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
