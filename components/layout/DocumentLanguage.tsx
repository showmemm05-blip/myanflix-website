"use client";

import { useEffect } from "react";

import { useLanguage } from "@/lib/context/language-context";

/**
 * Mirrors the chosen UI language onto `<html lang>` ("my" for Burmese, "en"
 * for English). Screen readers then pick the right voice, and the Marquee
 * `:lang(my)` rules in globals.css (no letter-spacing on overlines, +4px
 * leading on body copy) apply to the whole page. Renders nothing.
 */
export function DocumentLanguage() {
  const { language } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language === "mm" ? "my" : "en";
  }, [language]);

  return null;
}
