import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible,
  Geist_Mono,
  Inter,
  Literata,
  Noto_Sans_Myanmar,
  Noto_Serif_Myanmar,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/query-provider";
import { AuthProvider } from "@/lib/context/auth-context";
import { LibraryProvider } from "@/lib/context/library-context";
import { SubscriptionProvider } from "@/lib/context/subscription-context";
import { LanguageProvider } from "@/lib/context/language-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Inter/Plus Jakarta Sans have no Myanmar glyphs at all — without this,
// Burmese text falls back to whatever generic font the OS happens to pick,
// which can render inconsistently or as tofu boxes. Included in the font
// stack (globals.css) as a fallback, not a replacement, so Latin text is
// unaffected.
const notoSansMyanmar = Noto_Sans_Myanmar({
  variable: "--font-noto-myanmar",
  subsets: ["myanmar", "latin"],
  weight: ["400", "500", "600", "700"],
});

// The reader's face, and only the reader's — Literata was drawn for
// long-form screen reading (it is what Google Play Books sets), and a serif
// is most of what makes a page of text read as a book rather than as a web
// page. Nothing outside /read uses it.
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
});

// The Burmese half of that pairing: Literata has no Myanmar glyphs, and the
// sans fallback would make a Burmese book the one book that isn't set in a
// serif.
const notoSerifMyanmar = Noto_Serif_Myanmar({
  variable: "--font-noto-serif-myanmar",
  subsets: ["myanmar"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// The reader's "Easy read" face — Atkinson Hyperlegible was designed by the
// Braille Institute for low-vision legibility and is the closest
// well-hinted, freely-licensed face to a dyslexia-friendly setting.
// Self-hosted by next/font (no runtime CDN request). No dyslexia-specific
// Myanmar face exists, so Burmese under this setting falls back to
// Noto Sans Myanmar via the .font-reading-dyslexic stack in globals.css.
const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyanFlix — Stream & Own Your Favorite Movies",
  description: "MyanFlix is a premium movie streaming platform. Buy and stream your favorite Myanmar and international films.",
};

/**
 * `viewportFit: "cover"` is what makes `env(safe-area-inset-*)` report real
 * values on notched phones — without it the bottom tab bar would float above
 * the home indicator instead of sitting under it.
 */
export const viewport: Viewport = {
  themeColor: "#0b0d16",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable} ${geistMono.variable} ${notoSansMyanmar.variable} ${literata.variable} ${notoSerifMyanmar.variable} ${atkinsonHyperlegible.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" disableTransitionOnChange>
          <QueryProvider>
            <LanguageProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <LibraryProvider>
                    <TooltipProvider>
                      {children}
                      <Toaster position="top-right" />
                    </TooltipProvider>
                  </LibraryProvider>
                </SubscriptionProvider>
              </AuthProvider>
            </LanguageProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
