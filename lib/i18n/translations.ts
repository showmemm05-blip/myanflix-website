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
  home: {
    banner: {
      title: "MyanFlix",
      subtitle: "Entertainment, stories, and everything our company is building — all in one place.",
    },
    announcements: {
      eyebrow: "What's New",
      title: "Announcements & Offers",
      items: [
        { badge: "Update", title: "4K HDR streaming is here", text: "Selected new releases now stream in 4K HDR on supported devices — no extra charge." },
        { badge: "New", title: "Myanmar Originals launching", text: "Our first slate of locally produced Originals starts rolling out this quarter." },
        { badge: "Offer", title: "Refer a friend, earn credit", text: "Invite a friend to MyanFlix and you both get wallet credit once they make their first purchase." },
        { badge: "Product", title: "MyanFlix is coming to TV", text: "A dedicated smart-TV app is in testing now, built for the big screen." },
      ],
    },
    behindTheScenes: {
      eyebrow: "Behind the Scenes",
      title: "Craft Behind the Screen",
      subtitle: "A peek into the sets, studios, and people shaping what you watch.",
      items: [
        { caption: "On set in Yangon", description: "Our production crew filming an upcoming Myanmar Original at first light." },
        { caption: "Color grading suite", description: "Every title passes through color grading before it's cleared for release." },
        { caption: "Subtitle & dub studio", description: "Where our localization team turns every film into a two-language experience." },
        { caption: "Encoding farm", description: "The pipeline that turns a single master file into every quality tier you stream." },
      ],
    },
    team: {
      eyebrow: "The People",
      title: "Meet the Team",
      subtitle: "The creators and crew building MyanFlix, on and off screen.",
      members: [
        { name: "Aye Aye Mon", role: "Head of Content", bio: "Curates every title that makes it to the front page." },
        { name: "Kyaw Zin Htet", role: "Lead Engineer", bio: "Keeps the streaming pipeline fast, wherever you're watching from." },
        { name: "Su Su Hlaing", role: "Creative Director", bio: "Shapes the look and feel of every MyanFlix Original." },
        { name: "Min Thu Aung", role: "Community Lead", bio: "Runs the events and creator partnerships you'll see below." },
      ],
    },
    partners: {
      eyebrow: "Collaborations",
      title: "Our Partners",
      subtitle: "Studios and organizations we make things with.",
      items: [
        { name: "Golden Reel Studios", description: "Production partner for our Myanmar Originals slate." },
        { name: "SEA Film Collective", description: "A regional network championing Southeast Asian cinema." },
        { name: "Yangon Sound Works", description: "Our audio mixing and mastering partner." },
        { name: "FrameWorks Post", description: "Color grading and visual effects studio." },
        { name: "Stagelight Distribution", description: "Brings international titles to MyanFlix first." },
      ],
    },
    testimonials: {
      eyebrow: "Community",
      title: "Community Voices",
      subtitle: "Stories from viewers and members of the MyanFlix community.",
      items: [
        { quote: "Finally a place where Myanmar films get the same spotlight as international ones.", name: "Thiri Kyaw", role: "Member since 2024" },
        { quote: "The watch party I hosted for our film club sold out our whole group in a day.", name: "Nay Lin Zaw", role: "Community organizer" },
        { quote: "I discovered three of my favorite directors through the recommendations here.", name: "Hnin Wai Yan", role: "Member since 2023" },
        { quote: "Subtitles in both languages made it easy to introduce my parents to the app.", name: "Zaw Min Oo", role: "Member since 2025" },
      ],
    },
    news: {
      eyebrow: "Stories",
      title: "MyanFlix Stories",
      subtitle: "News, interviews, and features from around MyanFlix.",
      items: [
        { tag: "Interview", title: "Inside the making of our first Original series", excerpt: "We sat down with the crew behind our upcoming drama to talk process, challenges, and what's next.", date: "This month" },
        { tag: "Community", title: "How local film clubs are using Watch Parties", excerpt: "A look at how communities across the country are gathering around shared screenings.", date: "Recently" },
        { tag: "Product", title: "A look inside our streaming pipeline", excerpt: "From upload to playback — the engineering behind getting a film to your screen in minutes.", date: "This month" },
      ],
    },
    roadmap: {
      eyebrow: "What's Next",
      title: "The Road Ahead",
      subtitle: "Where MyanFlix is headed — shipped, in progress, and upcoming.",
      items: [
        { period: "Shipped", title: "Series & seasons", description: "Full series support with one purchase unlocking every season and episode.", status: "shipped" },
        { period: "Shipped", title: "Phone sign-in", description: "Sign up and sign in with just a phone number and a one-time code.", status: "shipped" },
        { period: "In progress", title: "Smart-TV app", description: "A dedicated app built for the living room, currently in testing.", status: "inProgress" },
        { period: "Upcoming", title: "Offline downloads", description: "Download a title on Wi-Fi, watch it anywhere without a connection.", status: "upcoming" },
        { period: "Upcoming", title: "Watch parties", description: "Synced group viewing with friends, wherever they are.", status: "upcoming" },
      ],
    },
    cta: {
      title: "There's more to explore",
      subtitle: "Dive into the full catalog of movies and series, or browse by category.",
      browseMovies: "Browse Movies",
      browseSeries: "Browse Series",
      exploreCategories: "Explore Categories",
    },
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
  home: {
    banner: {
      title: "MyanFlix",
      subtitle: "ကျွန်ုပ်တို့ကုမ္ပဏီ တည်ဆောက်နေသော ဖျော်ဖြေရေး၊ ဇာတ်လမ်းများနှင့် အရာအားလုံး — တစ်နေရာတည်းတွင်။",
    },
    announcements: {
      eyebrow: "အသစ်များ",
      title: "ကြေညာချက်များနှင့် ပရိုမိုးရှင်းများ",
      items: [
        { badge: "အပ်ဒိတ်", title: "4K HDR streaming စတင်ပါပြီ", text: "ရုပ်ရှင်အသစ်အချို့ကို ထောက်ခံသည့်စက်ပစ္စည်းများတွင် အခမဲ့ 4K HDR ဖြင့် ကြည့်ရှုနိုင်ပါပြီ။" },
        { badge: "အသစ်", title: "မြန်မာ Originals များ မကြာမီစတင်", text: "ကျွန်ုပ်တို့ ကိုယ်ပိုင်ထုတ်လုပ်သည့် Original ပထမဆုံးစီးရီးများကို ဤသုံးလပတ်တွင် စတင်ပြသမည်။" },
        { badge: "ပရိုမိုးရှင်း", title: "မိတ်ဆွေကိုမိတ်ဆက်ပြီး အကျိုးအမြတ်ရယူပါ", text: "မိတ်ဆွေတစ်ဦးကို MyanFlix သို့ ဖိတ်ခေါ်ပြီး ၎င်းတို့၏ ပထမဆုံးဝယ်ယူမှုပြီးလျှင် နှစ်ဦးစလုံး ပိုက်ဆံအိတ်ခရက်ဒစ် ရရှိမည်။" },
        { badge: "ထုတ်ကုန်", title: "MyanFlix TV အက်ပ် မကြာမီရောက်ရှိ", text: "စမတ်တီဗီအတွက် အထူးဒီဇိုင်းထုတ်ထားသည့် အက်ပ်ကို ယခုစမ်းသပ်နေဆဲဖြစ်သည်။" },
      ],
    },
    behindTheScenes: {
      eyebrow: "ရုပ်ရှင်နောက်ကွယ်",
      title: "ဖန်တီးမှုနောက်ကွယ်က အလုပ်",
      subtitle: "သင်ကြည့်ရှုနေသည့်အရာများကို ပုံဖော်ပေးသော ဖလင်ရိုက်ကွင်း၊ စတူဒီယိုနှင့် လူများအကြောင်း တစ်စိတ်တစ်ပိုင်း။",
      items: [
        { caption: "ရန်ကုန်တွင် ဖလင်ရိုက်ခြင်း", description: "မကြာမီထွက်ရှိမည့် မြန်မာ Original တစ်ခုကို နံနက်စောစော ရိုက်ကူးနေသည့် ကျွန်ုပ်တို့၏ ထုတ်လုပ်ရေးအဖွဲ့။" },
        { caption: "အရောင်ညှိစတူဒီယို", description: "ရုပ်ရှင်တိုင်းသည် ထုတ်လွှင့်ခွင့်မပြုမီ အရောင်ညှိခြင်းအဆင့်ကို ဖြတ်သန်းရသည်။" },
        { caption: "စာတန်းထိုးနှင့် အသံသွင်းစတူဒီယို", description: "ကျွန်ုပ်တို့၏ ဘာသာပြန်အဖွဲ့က ရုပ်ရှင်တိုင်းကို ဘာသာစကားနှစ်မျိုးဖြင့် ခံစားနိုင်အောင် ပြင်ဆင်ပေးသည့်နေရာ။" },
        { caption: "အင်ကုတ်ဒင်းလုပ်ငန်းစဉ်", description: "မာစတာဖိုင်တစ်ခုတည်းမှ သင်ကြည့်ရှုနေသည့် အရည်အသွေးအဆင့်တိုင်းအဖြစ် ပြောင်းလဲပေးသည့် လုပ်ငန်းစဉ်။" },
      ],
    },
    team: {
      eyebrow: "လူများ",
      title: "အဖွဲ့ဝင်များနှင့် တွေ့ဆုံပါ",
      subtitle: "ကျွန်ုပ်တို့၏ MyanFlix ကို တည်ဆောက်နေသော ဖန်တီးသူများနှင့် ဝန်ထမ်းများ။",
      members: [
        { name: "အေးအေးမွန်", role: "အကြောင်းအရာဌာနတာဝန်ခံ", bio: "ပင်မစာမျက်နှာသို့ရောက်လာသော ဇာတ်လမ်းတိုင်းကို ရွေးချယ်ပေးသူ။" },
        { name: "ကျော်ဇင်ထက်", role: "ဦးဆောင်အင်ဂျင်နီယာ", bio: "သင်ဘယ်နေရာကနေကြည့်နေသည်ဖြစ်စေ streaming pipeline ကို မြန်ဆန်စွာထိန်းသိမ်းပေးသူ။" },
        { name: "စုစုလှိုင်", role: "ဖန်တီးမှုညွှန်ကြားရေးမှူး", bio: "MyanFlix Original တိုင်း၏ အသွင်အပြင်ကို ပုံဖော်ပေးသူ။" },
        { name: "မင်းသူအောင်", role: "အသိုင်းအဝိုင်းတာဝန်ခံ", bio: "အောက်တွင်တွေ့ရမည့် ပွဲများနှင့် ဖန်တီးသူများနှင့် ပူးပေါင်းဆောင်ရွက်မှုများကို ဦးဆောင်သူ။" },
      ],
    },
    partners: {
      eyebrow: "ပူးပေါင်းဆောင်ရွက်မှုများ",
      title: "ကျွန်ုပ်တို့၏ မိတ်ဖက်များ",
      subtitle: "ကျွန်ုပ်တို့ ပူးပေါင်းလုပ်ဆောင်နေသော စတူဒီယိုများနှင့် အဖွဲ့အစည်းများ။",
      items: [
        { name: "Golden Reel Studios", description: "ကျွန်ုပ်တို့၏ မြန်မာ Originals များအတွက် ထုတ်လုပ်ရေးမိတ်ဖက်။" },
        { name: "SEA Film Collective", description: "အရှေ့တောင်အာရှ ရုပ်ရှင်များကို မြှင့်တင်ပေးသည့် ဒေသဆိုင်ရာကွန်ရက်။" },
        { name: "Yangon Sound Works", description: "ကျွန်ုပ်တို့၏ အသံနှောစပ်ခြင်းနှင့် mastering မိတ်ဖက်။" },
        { name: "FrameWorks Post", description: "အရောင်ညှိခြင်းနှင့် အထူးဂရပ်ဖစ်များ စတူဒီယို။" },
        { name: "Stagelight Distribution", description: "နိုင်ငံတကာဇာတ်ကားများကို MyanFlix သို့ ဦးဆုံးယူဆောင်ပေးသူ။" },
      ],
    },
    testimonials: {
      eyebrow: "အသိုင်းအဝိုင်း",
      title: "အသိုင်းအဝိုင်း၏ အသံများ",
      subtitle: "MyanFlix ကြည့်ရှုသူများနှင့် အသင်းဝင်များထံမှ ဇာတ်လမ်းများ။",
      items: [
        { quote: "နောက်ဆုံးတော့ မြန်မာရုပ်ရှင်များကို နိုင်ငံတကာဇာတ်ကားများနှင့် တန်းတူ ဂုဏ်ပြုသည့်နေရာတစ်ခုရှိပါပြီ။", name: "သီရိကျော်", role: "၂၀၂၄ ခုနှစ်မှစ၍ အသင်းဝင်" },
        { quote: "ကျွန်ုပ်၏ ရုပ်ရှင်ကလပ်အတွက် စီစဉ်ခဲ့သည့် Watch Party ကို တစ်ရက်အတွင်း အုပ်စုအပြည့်ဖြစ်သွားသည်။", name: "နေလင်းဇော်", role: "အသိုင်းအဝိုင်းစီစဉ်သူ" },
        { quote: "ဤနေရာမှ အကြံပြုချက်များကြောင့် ကျွန်ုပ်အကြိုက်ဆုံးဒါရိုက်တာသုံးဦးကို ရှာဖွေတွေ့ရှိခဲ့သည်။", name: "နှင်းဝေယံ", role: "၂၀၂၃ ခုနှစ်မှစ၍ အသင်းဝင်" },
        { quote: "ဘာသာစကားနှစ်မျိုးဖြင့် စာတန်းထိုးထားခြင်းကြောင့် မိဘများကို အက်ပ်နှင့် မိတ်ဆက်ပေးရန် လွယ်ကူသွားသည်။", name: "ဇော်မင်းဦး", role: "၂၀၂၅ ခုနှစ်မှစ၍ အသင်းဝင်" },
      ],
    },
    news: {
      eyebrow: "ဇာတ်လမ်းများ",
      title: "MyanFlix ဇာတ်လမ်းများ",
      subtitle: "MyanFlix ပတ်ဝန်းကျင်မှ သတင်းများ၊ တွေ့ဆုံမေးမြန်းချက်များနှင့် ဆောင်းပါးများ။",
      items: [
        { tag: "တွေ့ဆုံမေးမြန်းချက်", title: "ကျွန်ုပ်တို့၏ ပထမဆုံး Original စီးရီး ရိုက်ကူးမှုနောက်ကွယ်", excerpt: "မကြာမီထွက်ရှိမည့် ဒရာမာဇာတ်လမ်းတွဲနောက်ကွယ်ရှိ အဖွဲ့နှင့် လုပ်ငန်းစဉ်၊ စိန်ခေါ်မှုများအကြောင်း ဆွေးနွေးထားသည်။", date: "ယခုလ" },
        { tag: "အသိုင်းအဝိုင်း", title: "ဒေသဆိုင်ရာ ရုပ်ရှင်ကလပ်များ Watch Party အသုံးပြုပုံ", excerpt: "နိုင်ငံတစ်ဝှမ်းလုံးရှိ အသိုင်းအဝိုင်းများ ဇာတ်လမ်းတူညီစွာကြည့်ရှုမှုများအတွက် စုစည်းလာပုံကို လေ့လာကြည့်ကြပါစို့။", date: "မကြာသေးမီက" },
        { tag: "ထုတ်ကုန်", title: "ကျွန်ုပ်တို့၏ streaming pipeline အတွင်းသို့", excerpt: "တင်ခြင်းမှ ပြန်ကြည့်ခြင်းအထိ — ရုပ်ရှင်တစ်ကားကို မိနစ်ပိုင်းအတွင်း သင့်စခရင်ပေါ်ရောက်အောင် ယူဆောင်ပေးသည့် အင်ဂျင်နီယာအလုပ်။", date: "ယခုလ" },
      ],
    },
    roadmap: {
      eyebrow: "နောက်တစ်ဆင့်",
      title: "ရှေ့ဆက်လမ်းကြောင်း",
      subtitle: "MyanFlix ဦးတည်ရာ — ပြီးစီးပြီးသား၊ လုပ်ဆောင်နေဆဲနှင့် လာမည့်အစီအစဉ်များ။",
      items: [
        { period: "ပြီးစီးပြီး", title: "ဇာတ်လမ်းတွဲနှင့် ရာသီများ", description: "တစ်ကြိမ်ဝယ်ယူမှုဖြင့် ရာသီနှင့်အပိုင်းအားလုံးကို ဖွင့်ပေးသော ဇာတ်လမ်းတွဲစနစ်အပြည့်အစုံ။", status: "shipped" },
        { period: "ပြီးစီးပြီး", title: "ဖုန်းနံပါတ်ဖြင့် ဝင်ရောက်ခြင်း", description: "ဖုန်းနံပါတ်နှင့် တစ်ကြိမ်သုံးကုဒ်တစ်ခုဖြင့်သာ အကောင့်ဖွင့်ပြီး ဝင်ရောက်နိုင်ပါသည်။", status: "shipped" },
        { period: "လုပ်ဆောင်နေဆဲ", title: "စမတ်တီဗီအက်ပ်", description: "ဧည့်ခန်းအတွက် အထူးဒီဇိုင်းထုတ်ထားသော အက်ပ်ကို ယခုစမ်းသပ်နေဆဲ။", status: "inProgress" },
        { period: "လာမည့်အစီအစဉ်", title: "အော့ဖ်လိုင်း ဒေါင်းလုဒ်များ", description: "Wi-Fi ဖြင့် ဒေါင်းလုဒ်လုပ်ပြီး ချိတ်ဆက်မှုမလိုဘဲ နေရာမရွေးကြည့်ရှုနိုင်ပါမည်။", status: "upcoming" },
        { period: "လာမည့်အစီအစဉ်", title: "Watch Party များ", description: "မိတ်ဆွေများနှင့်အတူ မည်သည့်နေရာမှမဆို တစ်ပြိုင်နက်တည်း ကြည့်ရှုနိုင်ခြင်း။", status: "upcoming" },
      ],
    },
    cta: {
      title: "ထပ်မံရှာဖွေစရာများ ရှိပါသေးသည်",
      subtitle: "ရုပ်ရှင်နှင့် ဇာတ်လမ်းတွဲများ အပြည့်အစုံကို လေ့လာကြည့်ရှုပါ၊ သို့မဟုတ် အမျိုးအစားအလိုက် ရှာဖွေပါ။",
      browseMovies: "ရုပ်ရှင်များကြည့်ရန်",
      browseSeries: "ဇာတ်လမ်းတွဲများကြည့်ရန်",
      exploreCategories: "အမျိုးအစားများကြည့်ရန်",
    },
  },
} satisfies typeof en;

export const translations = { en, mm };
export type Language = keyof typeof translations;
export type TranslationShape = typeof en;
