import type { ReactNode } from "react";

import type { Language } from "@/lib/i18n/translations";
import { defineSection } from "./define";

/**
 * New strings for the Library area (My List, Watch history, and the Profile
 * page's "Your library" group) and the account family (Notifications,
 * Profile, Settings, the feedback and delete-account dialogs). Words the site
 * already had are reused from translations.ts (t.watchHistory.*,
 * t.notifications.*, t.profile.*, t.settings.*, t.feedback.*) and shell.ts
 * (myList, library, removeFromList, play, account, signOut…).
 */
export const libraryText = defineSection({
  en: {
    // ── Library header + tabs ──
    librarySubtitle: "What you’re watching, and what you saved for later.",
    librarySections: "Library sections",
    watchHistory: "Watch history",

    // ── Continue watching ──
    continueWatching: "Continue watching",
    continueSubtitle: "Pick up right where you left off",
    continueMeta: (percent: number, left: string) => `${percent}% · ${left} left`,
    continueLabel: (title: string, percent: number, left: string) =>
      `Resume ${title}, ${percent}% watched, ${left} left`,
    continueError: "Couldn’t load Continue watching",

    // ── My List toasts (lib/context/library-context.tsx) ──
    addedToList: "Added to My List",
    removedFromList: "Removed from My List",
    undo: "Undo",

    // ── My List ──
    loadingLibrary: "Loading your library",
    nothingHereTitle: "Nothing here yet",
    nothingHereBody: "What you watch and save will gather here. Press My List on any title to keep it for later.",
    browseMovies: "Browse movies",
    sortLabel: "Sort My List",
    sortRecent: "Recently saved",
    sortTitle: "Title A–Z",
    sortYear: "Release year",
    sortRating: "Rating",
    accessLabel: "Access",
    accessAll: "All",
    moviesSaved: (count: number) => (count === 1 ? "1 movie saved" : `${count} movies saved`),
    moviesShown: (shown: number, total: number) => `${shown} of ${total} ${total === 1 ? "movie" : "movies"}`,
    noMoviesTitle: "No movies saved yet",
    noMoviesBody: "Press My List on any movie to keep it here for later.",
    nothingMatches: "Nothing matches",
    noFreeMovies: "No free movies in your list.",
    noPremiumMovies: "No Premium movies in your list.",
    showAll: "Show all",
    subscribeToWatch: "Subscribe to watch",
    subscribeToWatchTitle: (title: string) => `Subscribe to watch ${title}`,
    posterLabel: (title: string, year: number, access: string) => `${title}, ${year}, ${access}`,
    browserNote: "My List is kept in this browser. Titles you save on another device or in the app won’t show here.",

    // ── Watch history ──
    loadingHistory: "Loading your watch history",
    historyCount: (count: number) => `${count} ${count === 1 ? "title" : "titles"} · newest first`,
    today: "Today",
    yesterday: "Yesterday",
    statusLeft: (percent: number, left: string) => `${percent}% watched · ${left} left`,
    progressLabel: (title: string, percent: number) => `${title}, ${percent}% watched`,
    completedLabel: (title: string) => `${title}, completed`,
    resumeFrom: (title: string, percent: number) => `Resume ${title} from ${percent}%`,
    watchAgainTitle: (title: string) => `Watch ${title} again`,

    // ── Account side menu ──
    unreadBadge: (count: number) => `${count} unread`,
    languageDisplay: "Language & display",
    helpPrivacy: "Help & privacy",

    // ── Notifications ──
    loadingNotifications: "Loading notifications",
    newCount: (count: number) => `${count} new`,
    unreadPrefix: "Unread.",
    notificationsEmptyBody: "New activity will land here — approvals, new releases and account updates.",
    notificationsNote: (settingsLink: ReactNode): ReactNode[] => [
      "Choose what we notify you about in ",
      settingsLink,
      ". Clear all removes them from this device only.",
    ],

    // ── Profile ──
    loadingProfile: "Loading your profile",
    premiumExpires: (date: string) => `Premium · expires ${date}`,
    subscriptionHeading: "Subscription",
    freeMember: "Free member",
    planActive: "Your plan is active",
    subBodyPremium: "Every Premium movie and series is open to you until your plan ends.",
    subBodyFree: "Subscribe to unlock every Premium movie and series. Pay from your wallet balance.",
    viewPlans: "View plans",
    photoHelp: "JPEG, PNG or WebP, up to 5 MB. Shown on your profile and in the top bar.",
    passwordHelp: "At least 8 characters. You stay signed in on this device.",

    // ── Profile: "Your library" group (the Profile page took Library's place) ──
    yourLibrary: "Your library",
    listEmptyTitle: "Titles you save appear here",
    listLoadError: "Couldn’t load My List",
    historyLoadError: "Couldn’t load your watch history",
    seeAllList: "See all of My List",
    seeAllHistory: "See all of your watch history",

    // ── Settings ──
    languageDisplayBody: "The website’s language and look.",
    languageHelp: "Changes every page right away. Movie titles stay as published.",
    themeHelp: "Dark is the only theme.",
    helpPrivacyBody: "Talk to the team, and see how your data is used.",
    privacyPolicy: "Privacy policy",
    loadingCode: "Loading your withdrawal code",
    codeLoadError: "Couldn’t load your withdrawal code. Check your connection and try again.",

    // ── Feedback dialog ──
    feedbackHelp: (min: number) => `At least ${min} characters. Sent from your MyanFlix account.`,
    charCount: (count: string, max: string) => `${count} / ${max}`,
  },
  mm: {
    librarySubtitle: "ကြည့်နေဆဲ ဇာတ်ကားများနှင့် နောက်မှကြည့်ရန် သိမ်းထားသည်များ။",
    librarySections: "စာကြည့်တိုက် အပိုင်းများ",
    watchHistory: "ကြည့်ရှုမှတ်တမ်း",

    continueWatching: "ဆက်ကြည့်ရန်",
    continueSubtitle: "ရပ်ထားခဲ့သည့်နေရာမှ ဆက်ကြည့်ပါ",
    continueMeta: (percent: number, left: string) => `${percent}% · ${left} ကျန်သည်`,
    continueLabel: (title: string, percent: number, left: string) =>
      `${title} ကို ဆက်ကြည့်ရန်၊ ${percent}% ကြည့်ပြီး၊ ${left} ကျန်သည်`,
    continueError: "ဆက်ကြည့်ရန် စာရင်းကို ဖွင့်၍မရပါ",

    // ── My List toasts ──
    addedToList: "ကျွန်ုပ်၏စာရင်းသို့ ထည့်ပြီးပါပြီ",
    removedFromList: "ကျွန်ုပ်၏စာရင်းမှ ဖယ်ရှားပြီးပါပြီ",
    undo: "ပြန်ပြင်ရန်",

    loadingLibrary: "သင်၏ စုစည်းမှုကို ဖွင့်နေသည်",
    nothingHereTitle: "ဘာမှ မရှိသေးပါ",
    nothingHereBody:
      "ကြည့်ထားသည်များနှင့် သိမ်းထားသည်များ ဒီနေရာတွင် စုစည်းထားပါမည်။ နောက်မှကြည့်ရန် မည်သည့်ဇာတ်ကားတွင်မဆို ကျွန်ုပ်၏စာရင်း ကို နှိပ်ပါ။",
    browseMovies: "ရုပ်ရှင်များ ရှာကြည့်ရန်",
    sortLabel: "ကျွန်ုပ်၏စာရင်းကို စီရန်",
    sortRecent: "မကြာသေးမီက သိမ်းထားသည်",
    sortTitle: "အမည် (A–Z)",
    sortYear: "ထွက်ရှိသည့်နှစ်",
    sortRating: "အဆင့်သတ်မှတ်ချက်",
    accessLabel: "ကြည့်ရှုခွင့်",
    accessAll: "အားလုံး",
    moviesSaved: (count: number) => `ရုပ်ရှင် ${count} ကား သိမ်းထားသည်`,
    moviesShown: (shown: number, total: number) => `ရုပ်ရှင် ${total} ကားအနက် ${shown} ကား`,
    noMoviesTitle: "သိမ်းထားသော ရုပ်ရှင် မရှိသေးပါ",
    noMoviesBody: "နောက်မှကြည့်ရန် မည်သည့်ရုပ်ရှင်တွင်မဆို ကျွန်ုပ်၏စာရင်း ကို နှိပ်ပြီး ဒီနေရာတွင် သိမ်းထားပါ။",
    nothingMatches: "ကိုက်ညီသည့်အရာ မရှိပါ",
    noFreeMovies: "သင့်စာရင်းတွင် အခမဲ့ ရုပ်ရှင် မရှိပါ။",
    noPremiumMovies: "သင့်စာရင်းတွင် Premium ရုပ်ရှင် မရှိပါ။",
    showAll: "အားလုံး ပြရန်",
    subscribeToWatch: "ကြည့်ရန် စာရင်းသွင်းပါ",
    subscribeToWatchTitle: (title: string) => `${title} ကို ကြည့်ရန် စာရင်းသွင်းပါ`,
    posterLabel: (title: string, year: number, access: string) => `${title}၊ ${year}၊ ${access}`,
    browserNote:
      "ကျွန်ုပ်၏စာရင်းကို ဤဘရောက်ဆာတွင်သာ သိမ်းထားပါသည်။ အခြားစက်တွင် သို့မဟုတ် အက်ပ်တွင် သိမ်းထားသော ဇာတ်ကားများ ဒီနေရာတွင် မပေါ်ပါ။",

    loadingHistory: "သင့်ကြည့်ရှုမှတ်တမ်းကို ဖွင့်နေသည်",
    historyCount: (count: number) => `ဇာတ်ကား ${count} ကား · အသစ်ဆုံးမှ စ၍`,
    today: "ယနေ့",
    yesterday: "မနေ့က",
    statusLeft: (percent: number, left: string) => `${percent}% ကြည့်ပြီး · ${left} ကျန်သည်`,
    progressLabel: (title: string, percent: number) => `${title}၊ ${percent}% ကြည့်ပြီး`,
    completedLabel: (title: string) => `${title}၊ ကြည့်ပြီးပါပြီ`,
    resumeFrom: (title: string, percent: number) => `${title} ကို ${percent}% မှ ဆက်ကြည့်ရန်`,
    watchAgainTitle: (title: string) => `${title} ကို ပြန်ကြည့်ရန်`,

    unreadBadge: (count: number) => `မဖတ်ရသေး ${count} ခု`,
    languageDisplay: "ဘာသာစကားနှင့် အသွင်အပြင်",
    helpPrivacy: "အကူအညီနှင့် ကိုယ်ရေးကိုယ်တာ",

    loadingNotifications: "အကြောင်းကြားချက်များကို ဖွင့်နေသည်",
    newCount: (count: number) => `အသစ် ${count} ခု`,
    unreadPrefix: "မဖတ်ရသေးပါ။",
    notificationsEmptyBody:
      "အတည်ပြုချက်များ၊ ဇာတ်ကားအသစ်များနှင့် အကောင့်ဆိုင်ရာ အပ်ဒိတ်များ ဒီနေရာတွင် ပေါ်လာပါမည်။",
    notificationsNote: (settingsLink: ReactNode): ReactNode[] => [
      "မည်သည့်အကြောင်းကြားချက်များ ရယူမည်ကို ",
      settingsLink,
      " တွင် ရွေးချယ်ပါ။ “အားလုံး ရှင်းရန်” သည် ဤစက်ပေါ်မှသာ ဖယ်ရှားပါသည်။",
    ],

    loadingProfile: "သင့်ပရိုဖိုင်ကို ဖွင့်နေသည်",
    premiumExpires: (date: string) => `Premium · ${date} တွင် သက်တမ်းကုန်မည်`,
    subscriptionHeading: "စာရင်းသွင်းမှု",
    freeMember: "အခမဲ့ အဖွဲ့ဝင်",
    planActive: "သင့်အစီအစဉ် အသက်ဝင်နေပါသည်",
    subBodyPremium: "သင့်အစီအစဉ် မကုန်မချင်း Premium ရုပ်ရှင်နှင့် ဇာတ်လမ်းတွဲ အားလုံးကို ကြည့်နိုင်ပါသည်။",
    subBodyFree:
      "Premium ရုပ်ရှင်နှင့် ဇာတ်လမ်းတွဲ အားလုံးကို ကြည့်ရန် စာရင်းသွင်းပါ။ ပိုက်ဆံအိတ် လက်ကျန်ငွေဖြင့် ပေးချေနိုင်ပါသည်။",
    viewPlans: "အစီအစဉ်များ ကြည့်ရန်",
    photoHelp: "JPEG၊ PNG သို့မဟုတ် WebP၊ 5 MB အထိ။ သင့်ပရိုဖိုင်နှင့် အပေါ်ဘားတွင် ပေါ်ပါမည်။",
    passwordHelp: "အနည်းဆုံး စာလုံး ၈ လုံး။ ဤစက်တွင် ဆက်လက် ဝင်ရောက်ထားပါမည်။",

    yourLibrary: "သင်၏ စုစည်းမှု",
    listEmptyTitle: "သိမ်းထားသော ဇာတ်ကားများ ဒီနေရာတွင် ပေါ်လာပါမည်",
    listLoadError: "ကျွန်ုပ်၏စာရင်းကို ဖွင့်၍မရပါ",
    historyLoadError: "သင့်ကြည့်ရှုမှတ်တမ်းကို ဖွင့်၍မရပါ",
    seeAllList: "ကျွန်ုပ်၏စာရင်း အားလုံးကြည့်ရန်",
    seeAllHistory: "ကြည့်ရှုမှတ်တမ်း အားလုံးကြည့်ရန်",

    languageDisplayBody: "ဝဘ်ဆိုက်၏ ဘာသာစကားနှင့် အသွင်အပြင်။",
    languageHelp: "စာမျက်နှာအားလုံး ချက်ချင်း ပြောင်းသွားပါမည်။ ဇာတ်ကားအမည်များမူ ထုတ်ဝေထားသည့်အတိုင်း ရှိနေပါမည်။",
    themeHelp: "အမှောင် အပြင်အဆင် တစ်မျိုးတည်းသာ ရှိပါသည်။",
    helpPrivacyBody: "ကျွန်ုပ်တို့အဖွဲ့နှင့် ဆက်သွယ်ပြီး သင့်အချက်အလက်ကို မည်သို့ အသုံးပြုသည်ကို ကြည့်ပါ။",
    privacyPolicy: "ကိုယ်ရေးကိုယ်တာ မူဝါဒ",
    loadingCode: "သင့်ငွေထုတ်ကုဒ်ကို ဖွင့်နေသည်",
    codeLoadError: "သင့်ငွေထုတ်ကုဒ်ကို ဖွင့်၍မရပါ။ အင်တာနက်ချိတ်ဆက်မှုကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။",

    feedbackHelp: (min: number) => `အနည်းဆုံး စာလုံး ${min} လုံး။ သင့် MyanFlix အကောင့်မှ ပို့ပါမည်။`,
    charCount: (count: string, max: string) => `${count} / ${max}`,
  },
});

export type LibraryText = (typeof libraryText)["en"];

// ── Dates in the reader's language ──────────────────────────────────────

/** Latin digits in Burmese too, like every other number on the site. */
function locale(language: Language) {
  return language === "mm" ? "my-MM-u-nu-latn" : "en-GB";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * A day heading for lists grouped by calendar day (watch history,
 * notifications). `key` is stable per local day; `label` is "Today",
 * "Yesterday" or the weekday; `date` is the calendar date ("7 October",
 * with the year when it is not this year).
 */
export function dayHeading(iso: string, language: Language, text: LibraryText, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { key: "unknown", label: "", date: "", relative: false };
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const weekday = date.toLocaleDateString(locale(language), { weekday: "long" });
  const calendar = date.toLocaleDateString(locale(language), {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}),
  });
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  if (days === 0) return { key, label: text.today, date: `${weekday}, ${calendar}`, relative: true };
  if (days === 1) return { key, label: text.yesterday, date: `${weekday}, ${calendar}`, relative: true };
  return { key, label: weekday, date: calendar, relative: false };
}

/** A clock time in the reader's language ("9:40 PM" / "21:40"). */
export function clockTime(iso: string, language: Language) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return language === "mm"
    ? date.toLocaleTimeString("my-MM-u-nu-latn", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** A calendar date in the reader's language ("7 Nov 2026"). */
export function shortDate(iso: string, language: Language, month: "short" | "long" = "short") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(language === "mm" ? "my-MM-u-nu-latn" : "en-GB", {
    day: "numeric",
    month,
    year: "numeric",
  });
}

/** "March 2026" in the reader's language. */
export function monthYear(iso: string, language: Language) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(language === "mm" ? "my-MM-u-nu-latn" : "en-US", { month: "long", year: "numeric" });
}

