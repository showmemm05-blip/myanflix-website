import Image from "next/image";
import { useLanguage } from "@/lib/context/language-context";
import { FALLBACK_COVER_URL } from "@/lib/placeholder";

/**
 * Static banner — no movie/series data. `FALLBACK_COVER_URL` is a
 * placeholder background; swap the `src` below for a real brand image
 * whenever one's ready.
 */
export function HomeBanner() {
  const { t } = useLanguage();

  return (
    <section className="relative h-[50vh] min-h-[360px] w-full overflow-hidden sm:h-[60vh]">
      <Image src={FALLBACK_COVER_URL} alt="" fill priority className="object-cover" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
      <div className="relative z-10 flex h-full max-w-[1600px] flex-col justify-end gap-3 px-4 pb-14 sm:px-6 lg:px-8">
        <h1 className="text-gradient-brand font-heading text-4xl font-bold tracking-tight sm:text-6xl">
          {t.home.banner.title}
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">{t.home.banner.subtitle}</p>
      </div>
    </section>
  );
}
