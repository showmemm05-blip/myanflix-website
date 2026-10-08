import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Literata, Noto_Sans_Myanmar, Noto_Serif_Myanmar } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { DocumentLanguage } from "@/components/layout/DocumentLanguage";
import { QueryProvider } from "@/lib/query-provider";
import { AuthProvider } from "@/lib/context/auth-context";
import { LibraryProvider } from "@/lib/context/library-context";
import { SubscriptionProvider } from "@/lib/context/subscription-context";
import { LanguageProvider } from "@/lib/context/language-context";

// MARQUEE's single UI face, for English and Burmese alike: Noto Sans Myanmar
// carries a full Latin set as well as the Myanmar script, so one family sets
// every word in the app at every weight the type scale uses (400–900).
const notoSansMyanmar = Noto_Sans_Myanmar({
  variable: "--font-ui",
  subsets: ["myanmar", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// The reader's faces, and only the reader's — the reader settings offer
// Serif (Literata + Noto Serif Myanmar), Sans (the UI face above) and
// Easy read (Atkinson Hyperlegible). Nothing outside /read uses these three,
// so they are NOT preloaded (`preload: false`): every other page would
// otherwise download ~400 KB of fonts it never draws. The @font-face rules
// and CSS variables stay global (on <html>) on purpose — the reader-settings
// sheet is portalled to <body>, outside any /read wrapper, and its previews
// need these variables. The browser fetches a file only when text is drawn
// in that face.
const literata = Literata({
  variable: "--font-literata",
  preload: false,
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
});

// The Burmese half of the serif pairing: Literata has no Myanmar glyphs.
const notoSerifMyanmar = Noto_Serif_Myanmar({
  variable: "--font-noto-serif-myanmar",
  preload: false,
  subsets: ["myanmar"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// The reader's "Easy read" face — designed by the Braille Institute for
// low-vision legibility. Burmese under this setting falls back to the UI face
// via the .font-reading-dyslexic stack in globals.css.
const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  preload: false,
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
 * values on notched phones — the floating dock sits above the home indicator
 * using it. The theme colour is Marquee's ground.
 */
export const viewport: Viewport = {
  themeColor: "#08080B",
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
      // The site is dark-only: `dark` is set here directly (globals.css keys
      // its dark variant off `.dark`). suppressHydrationWarning stays because
      // DocumentLanguage updates <html lang> on the client.
      className={`dark ${notoSansMyanmar.variable} ${literata.variable} ${notoSerifMyanmar.variable} ${atkinsonHyperlegible.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background">
        <QueryProvider>
          <LanguageProvider>
            {/* Keeps <html lang> in step with the chosen language, so
                screen readers pronounce Burmese as Burmese and the
                :lang(my) type rules (no tracking, looser leading) apply. */}
            <DocumentLanguage />
            <AuthProvider>
              <SubscriptionProvider>
                <LibraryProvider>
                  {children}
                  <Toaster />
                </LibraryProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
