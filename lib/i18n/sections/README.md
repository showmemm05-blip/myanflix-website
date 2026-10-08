# lib/i18n/sections — per-area strings

`lib/i18n/translations.ts` is shared by the whole site and nobody edits it during
the Marquee rebuild. New text goes in **your own file here**, one per area
(`home.ts`, `media.ts`, `search.ts`, `titles.ts`, `play.ts`, `library.ts`,
`wallet.ts`, `signin.ts`). `shell.ts` belongs to the foundation.

## 1. Reuse first

Before adding a string, look in `translations.ts` (`t.nav.*`, `t.common.*`,
`t.badges.*`, `t.wallet.*`…) and in `shell.ts` (`See all`, `Play {title}`,
`Add {title} to My List`, `Loading`, `Something went wrong`…). Only add what
does not exist.

## 2. Write the file

```ts
// lib/i18n/sections/wallet.ts
import { defineSection } from "./define";

export const walletText = defineSection({
  en: {
    heroTitle: "Your wallet",
    pending: (count: number) => `${count} pending`,
  },
  mm: {
    heroTitle: "သင့်ပိုက်ဆံအိတ်",
    pending: (count: number) => `စောင့်ဆိုင်းဆဲ ${count} ခု`,
  },
});
```

- English is the reference shape. Burmese must have **the same keys and the
  same value kinds** or `tsc` fails. Real Burmese only, never English copied
  into `mm`.
- A sentence is ONE string (or one function returning the whole sentence).
  Never glue clauses together in a component: Burmese word order is different
  (subject-object-verb), and `mm` is the site's default language.
- Brand names (MyanFlix, KBZPay, Premium) may stay Latin in both.

## 3. Use it

```tsx
"use client";
import { useSection } from "@/lib/i18n/sections/define";
import { walletText } from "@/lib/i18n/sections/wallet";

const w = useSection(walletText);
return <h1>{w.heroTitle}</h1>;
```

`useSection` is a hook (client components). Outside React, use
`pickSection(walletText, language)`.

## 4. Burmese typesetting

`<html lang>` follows the chosen language (`my` / `en`). In Burmese the
overline/kicker styles drop their letter-spacing and body text gets +4px of
leading automatically (globals.css). Leave room: Burmese runs about 30% longer
than English, so never fix a width to the English label.
