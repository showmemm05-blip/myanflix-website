import { defineSection } from "./define";

/**
 * Strings for the About page (/about) and its row in Settings › Help &
 * privacy. The footer's own "About" link is in shell.ts with the other
 * footer words.
 *
 * The TMDB credit sentence is NOT here on purpose: TMDB's terms give it word
 * for word, so it stays in English in both languages (lib/credits/tmdb.ts).
 */
export const aboutText = defineSection({
  en: {
    title: "About MyanFlix",
    tagline: "Movies, series and books in one place.",
    movieInfo: "Movie information",
    settingsBody: "What MyanFlix is, and where its movie information comes from.",
    settingsLink: "Read about MyanFlix",
  },
  mm: {
    title: "MyanFlix အကြောင်း",
    tagline: "ရုပ်ရှင်၊ ဇာတ်လမ်းတွဲနှင့် စာအုပ်များကို တစ်နေရာတည်းတွင် ကြည့်ရှုဖတ်ရှုနိုင်ပါသည်။",
    movieInfo: "ရုပ်ရှင်အချက်အလက်များ",
    settingsBody: "MyanFlix အကြောင်းနှင့် ရုပ်ရှင်အချက်အလက်များကို မည်သည့်နေရာမှ ရယူထားသည်ကို ဖော်ပြထားပါသည်။",
    settingsLink: "MyanFlix အကြောင်း ဖတ်ရန်",
  },
});

export type AboutText = (typeof aboutText)["en"];
