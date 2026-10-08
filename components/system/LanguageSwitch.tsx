"use client";

import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { SegmentedControl } from "./SegmentedControl";

/**
 * English | မြန်မာ — the quiet 30px switch used in the account menu, the
 * footer and the sign-in pages' minimal bar. Option labels stay in their own
 * script on purpose: you find your language by recognising it, not by having
 * it translated. Writes through the same LanguageProvider as before.
 */
export function LanguageSwitch({
  labelledBy,
  className,
}: {
  /** Id of a visible "Language" label; otherwise the group is named "Language". */
  labelledBy?: string;
  className?: string;
}) {
  const { language, setLanguage } = useLanguage();
  const s = useSection(shellText);

  return (
    <SegmentedControl
      size="sm"
      label={labelledBy ? undefined : s.language}
      labelledBy={labelledBy}
      value={language}
      onChange={setLanguage}
      className={className}
      options={[
        { value: "en", label: "English", lang: "en" },
        { value: "mm", label: "မြန်မာ", lang: "my" },
      ]}
    />
  );
}
