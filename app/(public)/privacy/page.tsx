"use client";

import { FileWarning } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { AuroraBackdrop, Surface } from "@/components/system";
import { useLanguage } from "@/lib/context/language-context";

/**
 * THE PRIVACY POLICY (H-16).
 *
 * A DRAFT for the owner to review before it takes effect, written from what
 * the app really collects (phone, name, photo, payments, watch and reading
 * history, comments, feedback, searches, IP/device) — so it opens with a
 * notice saying so, and every sentence that needs the owner's decision is
 * marked [in brackets]. The text lives in the i18n file like every other
 * sentence on the site, so it reads in Burmese and English alike.
 */
export default function PrivacyPage() {
  const { t } = useLanguage();
  const p = t.privacy;

  return (
    <div className="relative isolate mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <AuroraBackdrop />
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <PageHeader eyebrow={p.kicker} title={p.title} subtitle={p.subtitle} />

        <Surface
          role="note"
          radius="2xl"
          className="flex items-start gap-3 bg-premium/8 p-5 ring-premium/30 sm:p-6"
        >
          <FileWarning aria-hidden className="mt-0.5 size-5 shrink-0 text-premium" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">{p.draftTitle}</p>
            <p className="text-sm text-muted-foreground">{p.draftBody}</p>
            <p className="text-xs text-muted-foreground/80">{p.lastUpdated}</p>
          </div>
        </Surface>

        <div className="flex flex-col gap-4">
          {p.sections.map((section) => (
            <Surface
              key={section.heading}
              as="section"
              radius="2xl"
              className="flex flex-col gap-3 p-5 sm:p-6"
            >
              <h2 className="text-section-title">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets.length > 0 && (
                <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/60">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </Surface>
          ))}
        </div>
      </article>
    </div>
  );
}
