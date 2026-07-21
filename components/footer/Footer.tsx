import Link from "next/link";
import { Film, Link2, AtSign, X as XIcon } from "lucide-react";

const FOOTER_LINKS = [
  {
    heading: "Browse",
    links: [
      { href: "/movies", label: "All Movies" },
      { href: "/categories", label: "Categories" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/library", label: "My Library" },
      { href: "/watchlist", label: "Watchlist" },
      { href: "/wallet", label: "Wallet" },
      { href: "/settings", label: "Settings" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "#", label: "Help Center" },
      { href: "#", label: "Contact Us" },
      { href: "#", label: "Terms of Service" },
      { href: "#", label: "Privacy Policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-background">
      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Film className="size-4" />
              </div>
              <span className="text-lg font-bold tracking-tight">MyanFlix</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Stream and own your favorite Myanmar and international films, all in one place.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-foreground">
                <Link2 className="size-4" />
              </a>
              <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-foreground">
                <AtSign className="size-4" />
              </a>
              <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </a>
            </div>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.heading} className="flex flex-col gap-3">
              <p className="text-sm font-semibold">{group.heading}</p>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} MyanFlix. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
