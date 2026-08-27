"use client";

import { AuroraBackdrop } from "@/components/system/AuroraBackdrop";
import { MediaNav } from "@/components/media/MediaNav";
import { useLanguage } from "@/lib/context/language-context";

/**
 * THE MEDIA SECTION SHELL — one slim identity strip, one sticky category
 * switch, then whichever category page is showing.
 *
 * This layout is what makes the top navbar's single "Media" entry work: the
 * All | Movies | Books | Music split lives here, inside the section, and
 * because the layout (unlike the pages under it) survives category
 * navigation, the MediaNav's active pill slides between categories instead of
 * remounting.
 */
export default function MediaLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="relative isolate flex min-h-[70vh] flex-col">
      <AuroraBackdrop />

      <header className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-4 sm:px-6 sm:pt-8 lg:px-8">
        <h1 className="text-title">{t.nav.media}</h1>
        <p className="mt-1.5 text-body-muted">{t.media.subtitle}</p>
      </header>

      <MediaNav />

      <div className="flex-1">{children}</div>
    </div>
  );
}
