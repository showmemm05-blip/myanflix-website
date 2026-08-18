import Image from "next/image";
import Link from "next/link";

import { useLanguage } from "@/lib/context/language-context";
import { Button } from "@/components/ui/button";
import { Kicker } from "@/components/system/Kicker";
import { FALLBACK_COVER_URL } from "@/lib/placeholder";

/**
 * THE AURORA OPENING of the site — the first screen anyone sees.
 *
 * Static banner — no movie/series data. `FALLBACK_COVER_URL` is a placeholder
 * background; swap the `src` below for a real brand image whenever one's ready.
 *
 * Three scrim passes over the artwork (a vertical fade into the page, a
 * horizontal wash holding the text side, a bottom vignette) and the signature
 * aurora bleeding off the top edge, so the copy always lands on something dark
 * enough to read no matter what image sits behind it.
 */
export function HomeBanner() {
  const { t } = useLanguage();

  return (
    <section className="relative isolate flex min-h-[72vh] w-full flex-col justify-end overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src={FALLBACK_COVER_URL}
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-105 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_-60px_90px_-30px_var(--background)]" />
        <div aria-hidden className="aurora-wash pointer-events-none absolute inset-0 opacity-80 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-24 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <div className="flex max-w-2xl flex-col">
          <Kicker tone="primary">{t.auth.brandTagline}</Kicker>
          <h1 className="text-gradient-primary mt-3 text-display">{t.home.banner.title}</h1>
          <p className="mt-4 max-w-xl text-body-muted">{t.home.banner.subtitle}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              variant="onArt"
              size="pill"
              render={<Link href="/movies" />}
              nativeButton={false}
            >
              {t.home.cta.browseMedia}
            </Button>
            <Button
              size="pill"
              variant="ghost"
              className="bg-white/8 font-semibold text-white ring-1 ring-white/15 backdrop-blur-md ring-inset hover:bg-white/15 hover:text-white active:scale-[0.98]"
              render={<Link href="/movies?tab=movies" />}
              nativeButton={false}
            >
              {t.home.cta.exploreCategories}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
