"use client";

import Link from "next/link";
import { Link2, AtSign, X as XIcon } from "lucide-react";

import { Brand } from "@/components/shared/Brand";
import { Kicker } from "@/components/system/Kicker";
import { useLanguage } from "@/lib/context/language-context";

/**
 * The quiet close of every page. Same destinations as before — browse, account,
 * support, socials — restated in the Aurora Theater rhythm: kicker headings, a
 * hairline top edge, and a single faint aurora glow so the page ends on light
 * rather than on a hard line.
 */
export function Footer() {
  const { t } = useLanguage();

  const footerLinks = [
    {
      heading: t.footer.browse,
      links: [
        { href: "/movies?tab=movies", label: t.footer.allMovies },
        { href: "/movies?tab=series", label: t.nav.series },
      ],
    },
    {
      heading: t.footer.account,
      links: [
        { href: "/wallet", label: t.nav.wallet },
        { href: "/watchlist", label: t.nav.watchlist },
        { href: "/watch-history", label: t.watchHistory.title },
        { href: "/settings", label: t.nav.settings },
      ],
    },
    {
      heading: t.footer.support,
      links: [
        { href: "#", label: t.footer.helpCenter },
        { href: "#", label: t.footer.contactUs },
        { href: "#", label: t.footer.termsOfService },
        { href: "#", label: t.footer.privacyPolicy },
      ],
    },
  ];

  const socials = [
    { href: "#", label: "Facebook", icon: Link2 },
    { href: "#", label: "Instagram", icon: AtSign },
    { href: "#", label: "Twitter", icon: XIcon },
  ];

  return (
    <footer className="relative isolate mt-auto overflow-hidden border-t border-white/[0.06] bg-background">
      <div
        aria-hidden
        className="aurora-wash-soft pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-64 opacity-25 blur-3xl"
      />

      <div className="mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
          <div className="col-span-2 flex flex-col gap-4 sm:col-span-1">
            <Brand />
            <p className="max-w-xs text-sm text-muted-foreground">{t.footer.tagline}</p>
            <div className="flex items-center gap-2.5 pt-1">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex size-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10 transition-[background-color,color,transform] duration-200 ease-out ring-inset hover:-translate-y-0.5 hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <social.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.heading} className="flex flex-col gap-3.5">
              <Kicker>{group.heading}</Kicker>
              <ul className="flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-6 text-center text-xs text-muted-foreground">
          {t.footer.allRightsReserved(new Date().getFullYear())}
        </div>
      </div>
    </footer>
  );
}
