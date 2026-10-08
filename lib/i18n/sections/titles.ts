import { defineSection } from "./define";

/**
 * New strings for the three title pages (movie, series, book detail) and the
 * comment thread they share. Everything the old pages already said is reused
 * from translations.ts (t.movieDetail.*, t.seriesDetail.*, t.book.*,
 * t.comments.*) and shell.ts; only words the Marquee boards added live here.
 */
export const titlesText = defineSection({
  en: {
    // ── Hero ────────────────────────────────────────────────────────────
    film: "Film",
    book: "Book",
    more: "More",
    less: "Less",
    play: "Play",
    resume: "Resume",
    inMyList: "In My List",
    share: (title: string) => `Share ${title}`,
    playTitle: (title: string) => `Play ${title}`,
    genreAndCategories: "Genre and categories",
    rated: (value: string) => `Rated ${value}`,
    ageRating: (label: string) => `Age rating ${label}`,
    watched: "Watched",
    /** "47m in · 1h 17m left" */
    positionLeft: (watched: string, left: string) => `${watched} in · ${left} left`,
    /** A length of time in the viewer's language: "47m" / "1h 17m". */
    hoursMinutes: (hours: number, minutes: number) =>
      hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`,
    includedWithPlan: "Included with your Premium plan",
    // ── Side panel ──────────────────────────────────────────────────────
    aboutFilm: "About this film",
    aboutSeries: "About this series",
    aboutBook: "About this book",
    length: "Length",
    director: "Director",
    actor: "Actor",
    country: "Country",
    ageRatingLabel: "Age rating",
    access: "Access",
    upsellTitle: "Included with Premium",
    upsellBody: (title: string) =>
      `Watch ${title} and every Premium film and series for the length of your plan, paid from your wallet.`,
    seePlans: "See plans",
    // ── Rows ────────────────────────────────────────────────────────────
    castAndCrew: "Cast & crew",
    directorCount: (count: number) => (count === 1 ? "1 director" : `${count} directors`),
    crewLine: (directors: string, actors: string) => `${directors} · ${actors}`,
    moreGenreSeries: (genre: string) => `More ${genre} series`,
    moreInCategory: (category: string) => `More in ${category}`,
    moreBooks: "More books",
    // ── Series ──────────────────────────────────────────────────────────
    season: "Season",
    seasonEpisodes: (season: number, episodes: number) =>
      `Season ${season} · ${episodes === 1 ? "1 episode" : `${episodes} episodes`}`,
    episodeCode: (season: number, episode: number) => `S${season} · E${episode}`,
    resumeEpisode: (season: number, episode: number) => `Resume S${season} · E${episode}`,
    resumeEpisodeA11y: (title: string, season: number, episode: number, name: string) =>
      `Resume ${title}, season ${season} episode ${episode}, ${name}`,
    startWatchingA11y: (title: string) => `Start watching ${title}`,
    episodeWatched: (episode: number) => `Episode ${episode} watched`,
    minutesLeft: (minutes: number) => `${minutes}m left`,
    upNext: "Up next:",
    upNextTag: "UP NEXT",
    upNextEpisode: (episode: number, title: string) => `E${episode} ${title}`,
    episodeA11y: (o: {
      number: number;
      title: string;
      minutes: number | null;
      playable: boolean;
      watched: boolean;
      minutesLeft: number | null;
      upNext: boolean;
      lock: "subscribe" | "signIn" | null;
    }) => {
      const parts = [`${o.playable ? "Play episode" : "Episode"} ${o.number}`, o.title];
      if (o.minutes) parts.push(o.minutes === 1 ? "1 minute" : `${o.minutes} minutes`);
      if (o.watched) parts.push("watched");
      else if (o.minutesLeft !== null) parts.push(`${o.minutesLeft} minutes left`);
      if (o.upNext) parts.push("up next");
      if (o.lock === "subscribe") parts.push("subscribe to watch");
      if (o.lock === "signIn") parts.push("sign in to watch");
      return parts.join(", ");
    },
    // ── Book ────────────────────────────────────────────────────────────
    coverOf: (title: string, author: string) => `Cover of ${title} by ${author}`,
    sectionCount: (count: number) =>
      count === 0 ? "No sections" : count === 1 ? "1 section" : `${count} sections`,
    publishedOn: (date: string) => `Published ${date}`,
    readA11y: (label: string, title: string) => `${label}: ${title}`,
    readProgress: (percent: number, chapter: string) => `${percent}% · ${chapter}`,
    chapterNamed: (number: number, title: string) => `Chapter ${number}, ${title}`,
    readLabel: "Read",
    chaptersReady: (ready: number, soon: number) =>
      `${ready === 1 ? "1 chapter" : `${ready} chapters`} ready · ${soon} coming soon`,
    firstChapterFirst: "First chapter first",
    lastChapterFirst: "Last chapter first",
    sectionsOf: (chapter: number) => `Sections of chapter ${chapter}`,
    chapterA11y: (o: { number: number; title: string; pages: string | null; current: boolean }) =>
      [`Chapter ${o.number}`, o.title, o.pages, o.current ? "continue reading" : null].filter(Boolean).join(", "),
    sectionA11y: (number: string, title: string, page: number | null) =>
      page === null ? `Section ${number}, ${title}` : `Section ${number}, ${title}, from page ${page}`,
    signInToReadTitle: "Sign in to read books",
    signInToReadBody: "Books, chapters and your reading place are kept with your account. Sign in to open this book.",
    createAccount: "Create an account",
    loadingTitle: "Loading title",
    loadingBook: "Loading book",
    // ── Comments ────────────────────────────────────────────────────────
    yourComment: "Your comment",
    replyTo: (name: string) => `Reply to ${name}`,
  },
  mm: {
    film: "ရုပ်ရှင်",
    book: "စာအုပ်",
    more: "ပိုမိုဖတ်ရန်",
    less: "လျှော့ပြရန်",
    play: "ကြည့်ရန်",
    resume: "ဆက်ကြည့်ရန်",
    inMyList: "ကျွန်ုပ်၏စာရင်းတွင် ရှိသည်",
    share: (title: string) => `${title} ကို မျှဝေရန်`,
    playTitle: (title: string) => `${title} ကို ကြည့်ရန်`,
    genreAndCategories: "အမျိုးအစားနှင့် ကဏ္ဍများ",
    rated: (value: string) => `အဆင့်သတ်မှတ်ချက် ${value}`,
    ageRating: (label: string) => `အသက်အရွယ် သတ်မှတ်ချက် ${label}`,
    watched: "ကြည့်ပြီး",
    positionLeft: (watched: string, left: string) => `${watched} ကြည့်ပြီး · ${left} ကျန်သည်`,
    hoursMinutes: (hours: number, minutes: number) =>
      hours === 0 ? `${minutes} မိနစ်` : `${hours} နာရီ ${minutes} မိနစ်`,
    includedWithPlan: "သင့် Premium အစီအစဉ်တွင် ပါဝင်သည်",
    aboutFilm: "ဤရုပ်ရှင်အကြောင်း",
    aboutSeries: "ဤဇာတ်လမ်းတွဲအကြောင်း",
    aboutBook: "ဤစာအုပ်အကြောင်း",
    length: "ကြာချိန်",
    director: "ဒါရိုက်တာ",
    actor: "သရုပ်ဆောင်",
    country: "နိုင်ငံ",
    ageRatingLabel: "အသက်အရွယ် သတ်မှတ်ချက်",
    access: "ကြည့်ရှုခွင့်",
    upsellTitle: "Premium တွင် ပါဝင်သည်",
    upsellBody: (title: string) =>
      `${title} နှင့် Premium ရုပ်ရှင်၊ ဇာတ်လမ်းတွဲ အားလုံးကို သင့်အစီအစဉ်ကာလအတွင်း ကြည့်ရှုနိုင်ပါသည်။ ပိုက်ဆံအိတ်မှ ပေးချေရပါသည်။`,
    seePlans: "အစီအစဉ်များ ကြည့်ရန်",
    castAndCrew: "သရုပ်ဆောင်နှင့် ဖန်တီးသူများ",
    directorCount: (count: number) => `ဒါရိုက်တာ ${count} ဦး`,
    crewLine: (directors: string, actors: string) => `${directors} · ${actors}`,
    moreGenreSeries: (genre: string) => `နောက်ထပ် ${genre} ဇာတ်လမ်းတွဲများ`,
    moreInCategory: (category: string) => `${category} ကဏ္ဍမှ နောက်ထပ်စာအုပ်များ`,
    moreBooks: "နောက်ထပ် စာအုပ်များ",
    season: "ရာသီ",
    seasonEpisodes: (season: number, episodes: number) => `ရာသီ ${season} · အပိုင်း ${episodes} ပိုင်း`,
    episodeCode: (season: number, episode: number) => `ရာသီ ${season} · အပိုင်း ${episode}`,
    resumeEpisode: (season: number, episode: number) => `ရာသီ ${season} · အပိုင်း ${episode} ဆက်ကြည့်ရန်`,
    resumeEpisodeA11y: (title: string, season: number, episode: number, name: string) =>
      `${title} ရာသီ ${season} အပိုင်း ${episode}၊ ${name} ကို ဆက်ကြည့်ရန်`,
    startWatchingA11y: (title: string) => `${title} ကို စတင်ကြည့်ရန်`,
    episodeWatched: (episode: number) => `အပိုင်း ${episode} ကြည့်ရှုမှု`,
    minutesLeft: (minutes: number) => `${minutes} မိနစ် ကျန်သည်`,
    upNext: "နောက်တစ်ပိုင်း:",
    upNextTag: "နောက်တစ်ပိုင်း",
    upNextEpisode: (episode: number, title: string) => `အပိုင်း ${episode} ${title}`,
    episodeA11y: (o: {
      number: number;
      title: string;
      minutes: number | null;
      playable: boolean;
      watched: boolean;
      minutesLeft: number | null;
      upNext: boolean;
      lock: "subscribe" | "signIn" | null;
    }) => {
      const parts = [`အပိုင်း ${o.number}`, o.title];
      if (o.minutes) parts.push(`${o.minutes} မိနစ်`);
      if (o.watched) parts.push("ကြည့်ပြီး");
      else if (o.minutesLeft !== null) parts.push(`${o.minutesLeft} မိနစ် ကျန်သည်`);
      if (o.upNext) parts.push("နောက်တစ်ပိုင်း");
      if (o.lock === "subscribe") parts.push("ကြည့်ရန် စာရင်းသွင်းပါ");
      if (o.lock === "signIn") parts.push("ကြည့်ရန် အကောင့်ဝင်ပါ");
      if (o.playable) parts.push("ကြည့်ရန်");
      return parts.join("၊ ");
    },
    coverOf: (title: string, author: string) => `${author} ၏ ${title} စာအုပ်မျက်နှာဖုံး`,
    sectionCount: (count: number) => (count === 0 ? "အပိုင်းခွဲ မရှိပါ" : `အပိုင်းခွဲ ${count} ခု`),
    publishedOn: (date: string) => `${date} တွင် ထုတ်ဝေသည်`,
    readA11y: (label: string, title: string) => `${title}: ${label}`,
    readProgress: (percent: number, chapter: string) => `${percent}% · ${chapter}`,
    chapterNamed: (number: number, title: string) => `အခန်း ${number}၊ ${title}`,
    readLabel: "ဖတ်ရန်",
    chaptersReady: (ready: number, soon: number) => `အခန်း ${ready} ခု ဖတ်နိုင်ပြီ · ${soon} ခု မကြာမီ`,
    firstChapterFirst: "ပထမအခန်းမှ စတင်ပြရန်",
    lastChapterFirst: "နောက်ဆုံးအခန်းမှ စတင်ပြရန်",
    sectionsOf: (chapter: number) => `အခန်း ${chapter} ၏ အပိုင်းခွဲများ`,
    chapterA11y: (o: { number: number; title: string; pages: string | null; current: boolean }) =>
      [`အခန်း ${o.number}`, o.title, o.pages, o.current ? "ဆက်ဖတ်ရန်" : null].filter(Boolean).join("၊ "),
    sectionA11y: (number: string, title: string, page: number | null) =>
      page === null ? `အပိုင်းခွဲ ${number}၊ ${title}` : `အပိုင်းခွဲ ${number}၊ ${title}၊ စာမျက်နှာ ${page} မှ`,
    signInToReadTitle: "စာအုပ်ဖတ်ရန် အကောင့်ဝင်ပါ",
    signInToReadBody: "စာအုပ်များ၊ အခန်းများနှင့် သင်ဖတ်လက်စနေရာကို သင့်အကောင့်တွင် သိမ်းထားပါသည်။ ဤစာအုပ်ကို ဖွင့်ရန် အကောင့်ဝင်ပါ။",
    createAccount: "အကောင့်အသစ် ဖွင့်ရန်",
    loadingTitle: "ဇာတ်ကား ဖွင့်နေသည်",
    loadingBook: "စာအုပ် ဖွင့်နေသည်",
    yourComment: "သင့်မှတ်ချက်",
    replyTo: (name: string) => `${name} ထံ ပြန်စာရေးရန်`,
  },
});

export type TitlesText = (typeof titlesText)["en"];
