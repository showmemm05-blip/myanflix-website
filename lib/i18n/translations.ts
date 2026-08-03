// English is the reference shape — `mm` is typed against it (via `satisfies`
// further down), so a missing or mistyped Burmese key is a compile error,
// not a silent fallback to English at runtime.
const en = {
  common: {
    cancel: "Cancel",
    save: "Save",
    loading: "Loading…",
    retry: "Retry",
    back: "Back",
    close: "Close",
    confirm: "Confirm",
    delete: "Delete",
    seeAll: "See all",
    somethingWentWrong: "Something went wrong.",
  },
  nav: {
    home: "Home",
    movies: "Movies",
    series: "Series",
    categories: "Categories",
    myLibrary: "My Library",
    watchlist: "Watchlist",
    search: "Search",
    searchPlaceholder: "Search movies…",
    openNavigation: "Open navigation",
    notifications: "Notifications",
    profile: "Profile",
    wallet: "Wallet",
    settings: "Settings",
    logOut: "Log out",
    signIn: "Sign in",
  },
  language: {
    // Not translated on purpose — a language switcher's own options are
    // conventionally shown in their own language's script ("မြန်မာ" /
    // "English") regardless of what's currently active, so a user can find
    // their language by recognizing it, not by having it translated away.
    switcherLabel: "Language switcher",
  },
  search: {
    seeAllResultsFor: (term: string) => `See all results for "${term}"`,
  },
  footer: {
    tagline: "Stream and own your favorite Myanmar and international films, all in one place.",
    browse: "Browse",
    allMovies: "All Movies",
    account: "Account",
    support: "Support",
    helpCenter: "Help Center",
    contactUs: "Contact Us",
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy",
    allRightsReserved: (year: number) => `© ${year} MyanFlix. All rights reserved.`,
  },
};

const mm = {
  common: {
    cancel: "ပယ်ဖျက်",
    save: "သိမ်းဆည်း",
    loading: "လုပ်ဆောင်နေသည်…",
    retry: "ထပ်စမ်းရန်",
    back: "နောက်သို့",
    close: "ပိတ်",
    confirm: "အတည်ပြု",
    delete: "ဖျက်",
    seeAll: "အားလုံးကြည့်ရန်",
    somethingWentWrong: "တစ်ခုခုမှားယွင်းသွားပါသည်။",
  },
  nav: {
    home: "ပင်မ",
    movies: "ရုပ်ရှင်များ",
    series: "ဇာတ်လမ်းတွဲများ",
    categories: "အမျိုးအစားများ",
    myLibrary: "ကျွန်ုပ်၏စာကြည့်တိုက်",
    watchlist: "ကြည့်ရန်စာရင်း",
    search: "ရှာဖွေရန်",
    searchPlaceholder: "ရုပ်ရှင်များရှာဖွေရန်…",
    openNavigation: "လမ်းညွှန်ဖွင့်ရန်",
    notifications: "အကြောင်းကြားချက်များ",
    profile: "ကိုယ်ရေးအချက်အလက်",
    wallet: "ပိုက်ဆံအိတ်",
    settings: "ဆက်တင်များ",
    logOut: "ထွက်ရန်",
    signIn: "ဝင်ရောက်ရန်",
  },
  language: {
    switcherLabel: "ဘာသာစကားရွေးချယ်ရန်",
  },
  search: {
    seeAllResultsFor: (term: string) => `"${term}" အတွက် ရလဒ်အားလုံးကြည့်ရန်`,
  },
  footer: {
    tagline: "မြန်မာနှင့် နိုင်ငံတကာရုပ်ရှင်များကို တစ်နေရာတည်းတွင် ကြည့်ရှု၊ ပိုင်ဆိုင်နိုင်ပါသည်။",
    browse: "ကြည့်ရှုရန်",
    allMovies: "ရုပ်ရှင်အားလုံး",
    account: "အကောင့်",
    support: "အကူအညီ",
    helpCenter: "အကူအညီစင်တာ",
    contactUs: "ဆက်သွယ်ရန်",
    termsOfService: "ဝန်ဆောင်မှုစည်းမျဉ်းများ",
    privacyPolicy: "ကိုယ်ရေးကိုယ်တာမူဝါဒ",
    allRightsReserved: (year: number) => `© ${year} MyanFlix။ မူပိုင်ခွင့်အားလုံးကို ထိန်းသိမ်းထားသည်။`,
  },
} satisfies typeof en;

export const translations = { en, mm };
export type Language = keyof typeof translations;
export type TranslationShape = typeof en;
