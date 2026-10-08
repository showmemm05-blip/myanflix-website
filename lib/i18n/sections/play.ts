import { defineSection } from "./define";

/**
 * New strings for the full-window player and the book reader (Marquee
 * rebuild, 2026-10-07). Everything that already existed stays in
 * translations.ts (t.player.*, t.book.reader.*) and is reused from there.
 */
export const playText = defineSection({
  en: {
    // ── Player: states ──────────────────────────────────────────────────
    notFoundBody: "It may have been unpublished or the link is out of date.",
    buffering: "Buffering…",
    loadingVideo: "Loading the video",
    playbackErrorBody: "Check your connection, then open the title again.",
    // ── Player: top row and controls ────────────────────────────────────
    episodeTag: (season: number, episode: number) => `S${season} : E${episode}`,
    speedAndQualityNow: (quality: string) => `Playback speed and quality, ${quality}`,
    networkGood: "Good connection",
    networkSlow: "Slow connection",
    networkOffline: "No internet connection",
    caching: (count: number) => `Caching ${count}`,
    cacheReady: (from: string, to: string) => `Ready ${from}–${to}`,
    muted: "Muted",
    volumePercent: (percent: number) => `Volume ${percent}%`,
    // Display names only — the player keeps "Auto" / "Original" / "English" /
    // "Burmese" as its internal values.
    qualityAuto: "Auto",
    seekHud: (delta: number) => `${delta > 0 ? "+" : ""}${delta}s`,
    // ── Player: episode panel and up next ───────────────────────────────
    closeEpisodes: "Close episodes",
    seasons: "Seasons",
    watched: "Watched",
    continuePercent: (percent: number) => `Continue Watching · ${percent}%`,
    playNowIn: (seconds: number) => `Play now, starts in ${seconds} seconds`,
    // ── Player: below the video ─────────────────────────────────────────
    myList: "My List",
    inMyList: "In My List",
    moreLikeThisSubtitle: "Picked from the same genre",
    keyPlayPause: "play or pause",
    keySeek: "seek 10 seconds",
    keyFullscreen: "fullscreen",
    keyTheater: "theater mode",

    // ── Reader ──────────────────────────────────────────────────────────
    themeLabel: "Theme",
    fitLabel: "Fit",
    panels: "Book panels",
    clearSearch: "Clear search",
    loadingChapter: "Loading the chapter",
    loadingPages: "Loading pages",
    noteOnHighlight: "Note on this highlight",
    previousChapterNamed: (title: string) => `Previous chapter, ${title}`,
    nextChapterNamed: (title: string) => `Next chapter, ${title}`,
  },
  mm: {
    notFoundBody: "ထုတ်လွှင့်မှုမှ ဖယ်ရှားထားခြင်း သို့မဟုတ် လင့်ခ်သက်တမ်းကုန်သွားခြင်း ဖြစ်နိုင်ပါသည်။",
    buffering: "ဖွင့်ရန် ခဏစောင့်နေသည်…",
    loadingVideo: "ဗီဒီယိုကို ဖွင့်နေသည်",
    playbackErrorBody: "အင်တာနက်ချိတ်ဆက်မှုကို စစ်ဆေးပြီး ဤဇာတ်ကားကို ပြန်ဖွင့်ပါ။",
    episodeTag: (season: number, episode: number) => `ရာသီ ${season} : အပိုင်း ${episode}`,
    speedAndQualityNow: (quality: string) => `ဖွင့်နှုန်းနှင့် အရည်အသွေး၊ ${quality}`,
    networkGood: "ချိတ်ဆက်မှု ကောင်းသည်",
    networkSlow: "ချိတ်ဆက်မှု နှေးနေသည်",
    networkOffline: "အင်တာနက် ချိတ်ဆက်မှု မရှိပါ",
    caching: (count: number) => `သိမ်းဆည်းနေသည် ${count}`,
    cacheReady: (from: string, to: string) => `အဆင်သင့် ${from}–${to}`,
    muted: "အသံပိတ်ထားသည်",
    volumePercent: (percent: number) => `အသံ ${percent}%`,
    qualityAuto: "အလိုအလျောက်",
    seekHud: (delta: number) => `${delta > 0 ? "+" : ""}${delta} စက္ကန့်`,
    closeEpisodes: "အပိုင်းစာရင်းကို ပိတ်ရန်",
    seasons: "ရာသီများ",
    watched: "ကြည့်ပြီး",
    continuePercent: (percent: number) => `ဆက်ကြည့်ရန် · ${percent}%`,
    playNowIn: (seconds: number) => `ယခုဖွင့်ရန်၊ ${seconds} စက္ကန့်အကြာတွင် စတင်မည်`,
    myList: "ကျွန်ုပ်၏စာရင်း",
    inMyList: "ကျွန်ုပ်၏စာရင်းတွင် ရှိသည်",
    moreLikeThisSubtitle: "အမျိုးအစားတူ ဇာတ်ကားများမှ ရွေးထားသည်",
    keyPlayPause: "ဖွင့်ရန် သို့မဟုတ် ခဏရပ်ရန်",
    keySeek: "၁၀ စက္ကန့် ရှေ့/နောက် ရွှေ့ရန်",
    keyFullscreen: "မျက်နှာပြင်အပြည့်",
    keyTheater: "ရုပ်ရှင်ရုံ မုဒ်",
    themeLabel: "အရောင်ပုံစံ",
    fitLabel: "အရွယ်အစား ချိန်ညှိမှု",
    panels: "စာအုပ် အကန့်များ",
    clearSearch: "ရှာဖွေမှုကို ရှင်းရန်",
    loadingChapter: "အခန်းကို ဖွင့်နေသည်",
    loadingPages: "စာမျက်နှာများကို ဖွင့်နေသည်",
    noteOnHighlight: "ဤမှတ်သားချက်ပေါ်ရှိ မှတ်စု",
    previousChapterNamed: (title: string) => `ယခင်အခန်း၊ ${title}`,
    nextChapterNamed: (title: string) => `နောက်အခန်း၊ ${title}`,
  },
});
