import type { Metadata } from "next";
import { Geist_Mono, Inter, Noto_Sans_Myanmar, Plus_Jakarta_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "MyanFlix — Stream & Own Your Favorite Movies",
  description: "MyanFlix is a premium movie streaming platform. Buy and stream your favorite Myanmar and international films.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable} ${geistMono.variable} ${notoSansMyanmar.variable} h-full antialiased`}
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
