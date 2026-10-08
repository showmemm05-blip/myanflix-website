import { defineSection } from "./define";

/**
 * Home strings. The first blocks are the movies / series / books Home and
 * its showcase sections (owner, 2026-10-08): only the words no other
 * section already has — rows reuse mediaText (Continue watching, Recently
 * added, See all…), t.browse.topRatedRow and t.media.newBooks. The rest
 * belongs to the Arcade games storefront kept aside in
 * components/home/arcade (its own section
 * titles, badges, game descriptions and prices live in `t.home.store.*`).
 */
export const homeText = defineSection({
  en: {
    /* ── Home: movies, series and books (owner, 2026-10-08) ─────────── */
    /** The hero region's accessible name. */
    featuredTitles: "Featured titles",
    /** Hero kicker when the pick is not new (the NEW ones say "Recently added"). */
    featuredKicker: "Featured",
    newSeries: "New series",
    top10: "Top 10 most viewed",
    /** "Because you watched The Last Monsoon". */
    becauseYouWatched: (title: string) => `Because you watched ${title}`,
    /** The line under it: "More Drama". */
    moreOf: (name: string) => `More ${name}`,
    /** A ranked poster, read as one sentence: "Number 3, Golden Land, Premium". */
    rankedCard: (rank: number, title: string, premium: boolean) =>
      `Number ${rank}, ${title}${premium ? ", Premium" : ""}`,
    loadingHome: "Loading Home",
    loadHomeFailed: "Couldn’t load Home",
    /** The hero's Play on a series: it opens the title page, where the episodes are. */
    openSeries: (title: string) => `Open ${title}`,

    /* ── Home showcase (owner, "build it", 2026-10-08) ───────────────── */
    /** The hero carousel's accessible name. */
    heroLabel: "Featured on MyanFlix",
    /** Each slide's name: "Premium, 2 of 6". */
    slideName: (name: string, index: number, total: number) => `${name}, ${index} of ${total}`,
    /** The count beside the arrows: "2 of 6". */
    slideCount: (index: number, total: number) => `${index} of ${total}`,
    slides: "Slides",
    previousSlide: "Previous slide",
    nextSlide: "Next slide",
    /** Promo tag for a Subscribe slide / an Add money slide. */
    walletTag: "WALLET",
    signInToSubscribe: "Sign in to subscribe",
    signInToAddMoney: "Sign in to add money",
    /** A promo button that leaves the site. */
    opensInNewTab: (label: string) => `${label} (opens in a new tab)`,
    /** The real plan on a Subscribe slide: "10,000 Ks for 30 days". */
    planFor: (price: string, days: number) => `${price} for ${days} days`,
    /** The other plans after it: "or 4,000 Ks for 10 days". */
    planOr: (price: string, days: number) => `or ${price} for ${days} days`,
    paymentMethods: "Payment methods",
    /** The tonal button beside a Subscribe slide's button: jumps to the Premium band. */
    seePlans: "See plans",

    whyMyanflix: "Why MyanFlix",
    valueStoriesName: "Myanmar stories",
    valueStoriesLine: "Movies, series and books in one app.",
    valueHdName: "HD that adapts",
    valueHdLine: "240p to 720p, switching with your connection.",
    valueBooksName: "Books with chapters",
    valueBooksLine: "Free to read when you sign in.",
    valuePayName: "Pay the Myanmar way",
    valuePayLine: "KBZPay or WavePay.",
    /** A value tile, read as one sentence. */
    valueTile: (name: string, line: string) => `${name}. ${line}`,

    spotlight: "Spotlight",
    /** The spotlight's kicker when it is the newest movie (no admin pick). */
    newestOnMyanflix: "Newest on MyanFlix",
    pickedByTeam: "Picked by the MyanFlix team",
    /** The spotlight banner's link: "New this week: Golden Land". */
    spotlightLink: (kicker: string, title: string) => `${kicker}: ${title}`,
    readNow: "Read now",

    plansTitle: "Every Premium movie and series. One plan.",
    plansBody:
      "A plan unlocks every title marked Premium, on the web and on your phone. Renewing adds the days onto your current expiry.",
    perkUnlocks: "Unlocks every title marked Premium, on web and phone",
    perkStreams: "Streams from 240p to 720p, adapting to your connection",
    perkWallet: "Pay from your wallet: KBZPay or WavePay",
    perkNoAutoCharge: "No auto-charge. It simply ends unless you renew",
    planDays: (days: number) => `${days} days`,
    perDay: (amount: string, exact: boolean) => (exact ? `${amount} a day` : `about ${amount} a day`),
    planLineEvery: "Every Premium movie and series",
    planLineStreams: "Streams at 240p–720p",
    planLineStack: "Renew any time, days stack up",
    bestValue: "Best value",
    yourPlanTag: "Your plan",
    planCard: (name: string, price: string, days: number, best: boolean) =>
      `${name} plan, ${price} for ${days} days${best ? ", best value" : ""}`,
    /** The subscriber's line: "Your plan · expires 7 Nov 2026". */
    yourPlanExpires: (date: string) => `Your plan · expires ${date}`,
    subscribe: "Subscribe",
    extend: "Extend",
    /** The hero Subscribe slide's button for someone who already has Premium. */
    extendPremium: "Extend Premium",
    /** Shown in the Premium band when the plans could not be loaded. */
    plansLoadFailed: "We couldn't load the plans right now.",
    payWith: "Pay with",
    plansSignInNote: "Sign in to see the plans and their prices.",
    booksFree: "Books are free to read when you sign in.",

    readOnMyanflix: "Read on MyanFlix",
    booksPitch: "Novels and stories, chapter by chapter, in a reader that keeps your place.",
    openShelf: "Open the shelf",

    comingSoonSub: "What the team is preparing",
    games: "Games",
    gamesLine: "A new corner of MyanFlix is on the way.",
    /** A coming-soon card, read as one sentence (`date` may be empty). */
    soonCard: (title: string, date: string | null) => (date ? `${title}, ${date}` : `${title}, coming soon`),

    appKicker: "MyanFlix app",
    phoneTitle: "Watch on your phone",
    phoneBody:
      "Same account, same wallet. Pick up where you stopped, in English or Burmese, with a player that adapts from 240p to 720p.",
    appStoreSmall: "Download on the",
    playStoreSmall: "Get it on",
    /** A store badge's name: "App Store (opens in a new tab)". */
    storeLink: (store: string) => `${store} (opens in a new tab)`,

    /** Hero "Explore game" button, read out with the game's name (starts with the visible words). */
    exploreTitle: (title: string) => `Explore game: ${title}`,
    /** Hero spoken update when the slide changes: "2 of 6: Monsoon Run". */
    heroAnnounce: (slide: string, title: string) => `${slide}: ${title}`,
    /** Featured shelf card, read as one sentence. `rating` and `price` may be empty. */
    featuredCard: (title: string, genre: string, platforms: string, rating: string | null, price: string) =>
      [title, genre, platforms, rating ? `rated ${rating}` : "", price].filter(Boolean).join(", "),
    /** Discover poster, read as one sentence. `status` and `price` may be empty. */
    discoverCard: (title: string, genre: string, year: number, status: string, price: string) =>
      [title, genre, String(year), status, price].filter(Boolean).join(", "),
    /** Live tile: "Delta Drift, Live, 15.6K playing". */
    liveCard: (title: string, count: string) => `${title}, Live, ${count} playing`,
    /** Live tile with an event running. */
    liveCardEvent: (title: string, count: string, event: string) =>
      `${title}, Live, ${count} playing, Event live, ${event}`,
    /** The new-release band (the whole band is one link). */
    bandLabel: (title: string, price: string) => `New release, ${title}, ${price}, Explore game`,
    /** Free-to-play promo card. */
    freeCard: (title: string, count: string | null) =>
      count ? `Free to play, ${title}, Free, ${count} playing` : `Free to play, ${title}, Free`,
    /** Limited-time event promo card. */
    eventCard: (title: string, event: string | null) =>
      event ? `Limited-time event, ${title}, ${event}` : `Limited-time event, ${title}`,
    /** A Discover teaser for a category that is not built yet. */
    teaser: (name: string) => `${name}, coming soon`,

    /* ── Watch on MyanFlix (the hand-off lane into Media) ─────────────── */
    watchKicker: "Movies, series and books",
    watchTitle: "Watch on MyanFlix",
    openMedia: "Open Media",
    movies: "Movies",
    series: "Series",
    books: "Books",
    moviesLine: "Myanmar and world films, free and Premium",
    seriesLine: "Whole seasons, one episode at a time",
    booksLine: "Novels and stories, chapter by chapter",
    browseMovies: "Browse movies",
    browseSeries: "Browse series",
    browseBooks: "Browse books",
    signInToRead: "Sign in to read",
    /** A watch tile, read as one sentence (`cta` is "Browse movies" or "Sign in to read"). */
    watchCard: (name: string, line: string, cta: string) => `${name}, ${line}, ${cta}`,
  },
  mm: {
    featuredTitles: "အထူးရွေးချယ်ထားသော ဇာတ်ကားများ",
    featuredKicker: "အထူးရွေးချယ်ထားသည်",
    newSeries: "ဇာတ်လမ်းတွဲအသစ်များ",
    top10: "အကြည့်အများဆုံး ထိပ်တန်း ၁၀",
    becauseYouWatched: (title: string) => `${title} ကို ကြည့်ထားသောကြောင့်`,
    moreOf: (name: string) => `${name} အမျိုးအစား ထပ်မံကြည့်ရန်`,
    rankedCard: (rank: number, title: string, premium: boolean) =>
      `နံပါတ် ${rank}၊ ${title}${premium ? "၊ Premium" : ""}`,
    loadingHome: "ပင်မစာမျက်နှာကို ဖွင့်နေသည်",
    loadHomeFailed: "ပင်မစာမျက်နှာကို ဖွင့်၍ မရပါ",
    openSeries: (title: string) => `${title} ကို ဖွင့်ရန်`,

    heroLabel: "MyanFlix တွင် အထူးပြသထားသည်များ",
    slideName: (name: string, index: number, total: number) => `${name}၊ ${total} ခုအနက် ${index}`,
    slideCount: (index: number, total: number) => `${total} ခုအနက် ${index}`,
    slides: "ဆလိုက်များ",
    previousSlide: "ယခင် ဆလိုက်",
    nextSlide: "နောက် ဆလိုက်",
    walletTag: "ပိုက်ဆံအိတ်",
    signInToSubscribe: "စာရင်းသွင်းရန် အကောင့်ဝင်ပါ",
    signInToAddMoney: "ငွေဖြည့်ရန် အကောင့်ဝင်ပါ",
    opensInNewTab: (label: string) => `${label} (တဘ်အသစ်တွင် ဖွင့်မည်)`,
    planFor: (price: string, days: number) => `ရက် ${days} အတွက် ${price}`,
    planOr: (price: string, days: number) => `သို့မဟုတ် ရက် ${days} အတွက် ${price}`,
    paymentMethods: "ငွေပေးချေမှု နည်းလမ်းများ",
    seePlans: "အစီအစဉ်များ ကြည့်ရန်",

    whyMyanflix: "MyanFlix ကို ဘာကြောင့် ရွေးသင့်သလဲ",
    valueStoriesName: "မြန်မာ့ ဇာတ်လမ်းများ",
    valueStoriesLine: "ရုပ်ရှင်၊ ဇာတ်လမ်းတွဲနှင့် စာအုပ်များကို အက်ပ်တစ်ခုတည်းတွင် ရနိုင်သည်။",
    valueHdName: "လိုက်လျောညီထွေ ပြောင်းပေးသော HD",
    valueHdLine: "သင့်အင်တာနက်အလိုက် 240p မှ 720p အထိ အလိုအလျောက် ပြောင်းပေးသည်။",
    valueBooksName: "အခန်းလိုက် စာအုပ်များ",
    valueBooksLine: "အကောင့်ဝင်ပြီး အခမဲ့ ဖတ်ရှုနိုင်သည်။",
    valuePayName: "မြန်မာ့နည်းလမ်းဖြင့် ပေးချေပါ",
    valuePayLine: "KBZPay သို့မဟုတ် WavePay ဖြင့် ပေးချေနိုင်သည်။",
    valueTile: (name: string, line: string) => `${name}။ ${line}`,

    spotlight: "အထူးမီးမောင်းထိုးပြချက်",
    newestOnMyanflix: "MyanFlix တွင် အသစ်ဆုံး",
    pickedByTeam: "MyanFlix အဖွဲ့က ရွေးချယ်ထားသည်",
    spotlightLink: (kicker: string, title: string) => `${kicker}၊ ${title}`,
    readNow: "ယခု ဖတ်ရန်",

    plansTitle: "Premium ရုပ်ရှင်နှင့် ဇာတ်လမ်းတွဲ အားလုံး၊ အစီအစဉ် တစ်ခုတည်းဖြင့်။",
    plansBody:
      "အစီအစဉ်တစ်ခုက Premium အမှတ်အသားပါသော ဇာတ်ကားတိုင်းကို ဝက်ဘ်ဆိုက်နှင့် ဖုန်းနှစ်ခုလုံးတွင် ဖွင့်ပေးသည်။ သက်တမ်းတိုးပါက ရက်များကို လက်ရှိ သက်တမ်းကုန်ဆုံးရက်ပေါ်တွင် ထပ်ပေါင်းပေးသည်။",
    perkUnlocks: "Premium ဇာတ်ကားတိုင်းကို ဝက်ဘ်ဆိုက်နှင့် ဖုန်းတွင် ကြည့်ရှုနိုင်သည်",
    perkStreams: "သင့်အင်တာနက်အလိုက် 240p မှ 720p အထိ ကြည့်ရှုနိုင်သည်",
    perkWallet: "ပိုက်ဆံအိတ်မှ ပေးချေပါ — KBZPay သို့မဟုတ် WavePay",
    perkNoAutoCharge: "အလိုအလျောက် ငွေဖြတ်ခြင်း မရှိပါ။ သက်တမ်းမတိုးပါက ကုန်ဆုံးသွားရုံသာ ဖြစ်သည်",
    planDays: (days: number) => `ရက် ${days}`,
    perDay: (amount: string, exact: boolean) => (exact ? `တစ်ရက်လျှင် ${amount}` : `တစ်ရက်လျှင် ${amount} ခန့်`),
    planLineEvery: "Premium ရုပ်ရှင်နှင့် ဇာတ်လမ်းတွဲ အားလုံး",
    planLineStreams: "240p–720p ဖြင့် ကြည့်ရှုနိုင်သည်",
    planLineStack: "အချိန်မရွေး သက်တမ်းတိုးနိုင်ပြီး ရက်များ ထပ်ပေါင်းသည်",
    bestValue: "အတန်ဆုံး",
    yourPlanTag: "သင့်အစီအစဉ်",
    planCard: (name: string, price: string, days: number, best: boolean) =>
      `${name} အစီအစဉ်၊ ရက် ${days} အတွက် ${price}${best ? "၊ အတန်ဆုံး" : ""}`,
    yourPlanExpires: (date: string) => `သင့်အစီအစဉ် · ${date} တွင် သက်တမ်းကုန်မည်`,
    subscribe: "စာရင်းသွင်းရန်",
    extend: "သက်တမ်းတိုးရန်",
    extendPremium: "Premium သက်တမ်းတိုးရန်",
    plansLoadFailed: "အစီအစဉ်များကို ယခု မဖွင့်နိုင်ပါ။",
    payWith: "ပေးချေနိုင်သော နည်းလမ်းများ",
    plansSignInNote: "အစီအစဉ်များနှင့် ဈေးနှုန်းများကို ကြည့်ရန် အကောင့်ဝင်ပါ။",
    booksFree: "စာအုပ်များကို အကောင့်ဝင်ပြီး အခမဲ့ ဖတ်ရှုနိုင်သည်။",

    readOnMyanflix: "MyanFlix တွင် ဖတ်ရှုပါ",
    booksPitch: "ဝတ္ထုနှင့် ပုံပြင်များကို အခန်းလိုက် ဖတ်ရှုပါ — ဖတ်ထားသည့်နေရာကို မှတ်ထားပေးသည်။",
    openShelf: "စာအုပ်စင်ကို ဖွင့်ရန်",

    comingSoonSub: "အဖွဲ့က ပြင်ဆင်နေသည်များ",
    games: "ဂိမ်းများ",
    gamesLine: "MyanFlix ၏ ကဏ္ဍသစ်တစ်ခု မကြာမီ ရောက်လာပါမည်။",
    soonCard: (title: string, date: string | null) => (date ? `${title}၊ ${date}` : `${title}၊ မကြာမီ လာမည်`),

    appKicker: "MyanFlix အက်ပ်",
    phoneTitle: "ဖုန်းဖြင့် ကြည့်ရှုပါ",
    phoneBody:
      "အကောင့်တစ်ခုတည်း၊ ပိုက်ဆံအိတ်တစ်ခုတည်း။ ရပ်ခဲ့သည့်နေရာမှ အင်္ဂလိပ် သို့မဟုတ် မြန်မာဘာသာဖြင့် ဆက်ကြည့်ပါ — 240p မှ 720p အထိ လိုက်လျောညီထွေ ပြောင်းပေးသော ပလေယာဖြင့်။",
    appStoreSmall: "ဒေါင်းလုဒ်ရယူရန်",
    playStoreSmall: "ရယူရန်",
    storeLink: (store: string) => `${store} (တဘ်အသစ်တွင် ဖွင့်မည်)`,

    exploreTitle: (title: string) => `ဂိမ်းကို လေ့လာရန်: ${title}`,
    heroAnnounce: (slide: string, title: string) => `${slide}၊ ${title}`,
    featuredCard: (title: string, genre: string, platforms: string, rating: string | null, price: string) =>
      [title, genre, platforms, rating ? `အဆင့်သတ်မှတ်ချက် ${rating}` : "", price].filter(Boolean).join("၊ "),
    discoverCard: (title: string, genre: string, year: number, status: string, price: string) =>
      [title, genre, String(year), status, price].filter(Boolean).join("၊ "),
    liveCard: (title: string, count: string) => `${title}၊ တိုက်ရိုက်၊ ${count} ဦး ကစားနေသည်`,
    liveCardEvent: (title: string, count: string, event: string) =>
      `${title}၊ တိုက်ရိုက်၊ ${count} ဦး ကစားနေသည်၊ ပွဲ စတင်နေပြီ၊ ${event}`,
    bandLabel: (title: string, price: string) => `အသစ်ထွက်ရှိမှု၊ ${title}၊ ${price}၊ ဂိမ်းကို လေ့လာရန်`,
    freeCard: (title: string, count: string | null) =>
      count
        ? `အခမဲ့ ကစားနိုင်သည်၊ ${title}၊ အခမဲ့၊ ${count} ဦး ကစားနေသည်`
        : `အခမဲ့ ကစားနိုင်သည်၊ ${title}၊ အခမဲ့`,
    eventCard: (title: string, event: string | null) =>
      event ? `အချိန်ကန့်သတ် ပွဲ၊ ${title}၊ ${event}` : `အချိန်ကန့်သတ် ပွဲ၊ ${title}`,
    teaser: (name: string) => `${name}၊ မကြာမီ လာမည်`,

    watchKicker: "ရုပ်ရှင်၊ ဇာတ်လမ်းတွဲနှင့် စာအုပ်များ",
    watchTitle: "MyanFlix တွင် ကြည့်ရှုရန်",
    openMedia: "မီဒီယာ ဖွင့်ရန်",
    movies: "ရုပ်ရှင်များ",
    series: "ဇာတ်လမ်းတွဲများ",
    books: "စာအုပ်များ",
    moviesLine: "မြန်မာနှင့် ကမ္ဘာ့ရုပ်ရှင်များ၊ အခမဲ့နှင့် Premium",
    seriesLine: "ရာသီလိုက် အပိုင်းတိုင်း ဆက်တိုက်ကြည့်နိုင်သည်",
    booksLine: "ဝတ္ထုနှင့် ပုံပြင်များကို အခန်းလိုက် ဖတ်ရှုနိုင်သည်",
    browseMovies: "ရုပ်ရှင်များ ကြည့်ရန်",
    browseSeries: "ဇာတ်လမ်းတွဲများ ကြည့်ရန်",
    browseBooks: "စာအုပ်များ ကြည့်ရန်",
    signInToRead: "ဖတ်ရှုရန် အကောင့်ဝင်ပါ",
    watchCard: (name: string, line: string, cta: string) => `${name}၊ ${line}၊ ${cta}`,
  },
});
