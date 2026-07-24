"use client";

import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t.language.switcherLabel}
      className={cn(
        "flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5 text-xs font-medium",
        className,
      )}
    >
      {/* Each option is shown in its own script, not translated — so it stays recognizable regardless of the active language. */}
      <button
        type="button"
        onClick={() => setLanguage("mm")}
        aria-pressed={language === "mm"}
        className={cn(
          "rounded-full px-2 py-1 transition-colors",
          language === "mm" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        မြန်မာ
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={cn(
          "rounded-full px-2 py-1 transition-colors",
          language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        English
      </button>
    </div>
  );
}
