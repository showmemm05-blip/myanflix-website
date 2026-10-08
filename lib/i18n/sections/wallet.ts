import { defineSection } from "./define";

/**
 * New strings for the money pages (Wallet, Deposit, Withdraw, Transactions,
 * Subscribe) in the Marquee rebuild. Everything the old pages already said
 * is reused from translations.ts (t.wallet.*, t.transactions.*,
 * t.withdrawalCode.*, t.dialogs.*, t.status.*); only new words live here.
 */
export const walletText = defineSection({
  en: {
    // ── Wallet hero ──
    availableBalance: "Available balance",
    showBalance: "Show balance",
    hideBalance: "Hide balance",
    loadingBalance: "Loading balance",
    balanceError: "Couldn’t load your balance",
    balanceErrorHint: "You can still deposit or withdraw while we try again.",
    holdLine: (amount: string, count: number) =>
      `${amount} on hold for ${count} pending ${count === 1 ? "withdrawal" : "withdrawals"}`,
    history: "History",

    // ── Recent transactions panel ──
    seeAllTransactions: "See all transactions",
    showLabel: "Show",
    tabAll: "All",
    awaitingApproval: "Awaiting approval",
    today: "Today",
    yesterday: "Yesterday",
    listError: "Couldn’t load this list",
    loadingTransactions: "Loading transactions",
    totals: "Totals",

    // ── Right column ──
    waysToDeposit: "Ways to deposit",
    waysToDepositBody: "Transfer from your own account, then enter the 6-digit reference.",
    depositWith: (method: string) => `Deposit with ${method}`,
    toAccount: (name: string) => `To ${name}`,
    accountsCount: (count: number) => `${count} accounts to choose from`,

    // ── Deposit dialog ──
    depositFunds: "Deposit funds",
    depositStep1: "Step 1 of 2 · Amount and method",
    depositStep2: "Step 2 of 2 · Send the money, then confirm",
    requestSent: "Request sent",
    amount: "Amount",
    quickAmounts: "Quick amounts",
    loadingMethods: "Loading payment methods",
    tryLater: "Please try again later.",
    nextStepNote:
      "Next, send the money to this account and enter the 6-digit reference from your receipt. Your balance updates once staff confirm the transfer.",
    change: "Change",
    changeAmountOrMethod: "Change the amount or payment method",
    sendToMethod: (method: string) => `Send to ${method}`,
    accountNumber: "Account number",
    copy: "Copy",
    copiedStatus: "Account number copied",
    sendExactly: (amount: string, method: string) =>
      `Send exactly ${amount} from your own ${method} account, then type the reference from your receipt below.`,
    referenceHelp: (method: string) => `The 6-digit code from your ${method} transfer receipt.`,
    referenceError: (method: string) => `Enter the exact 6-digit reference from your ${method} receipt.`,
    continue: "Continue",
    submittingDeposit: "Submitting deposit",
    depositSubmittedTitle: "Deposit submitted",
    depositSubmittedBody:
      "It’s pending admin approval. Your balance updates once it’s reviewed, and you’ll get a notification.",
    sentTo: "Sent to",
    reference: "Reference",
    status: "Status",
    viewHistory: "View history",

    // ── Withdraw dialog ──
    withdrawFunds: "Withdraw funds",
    withdrawStep1: "Step 1 of 2 · Amount and account",
    withdrawStepCode: "Step 2 of 2 · Confirm with your code",
    withdrawStepCreate: "Step 2 of 2 · Create your withdrawal code",
    withdrawStepReset: "Step 2 of 2 · Reset your withdrawal code",
    withdrawSummaryTo: (amount: string, destination: string) =>
      `You are requesting to withdraw ${amount} to ${destination}.`,
    withdrawing: "Withdrawing",
    amountTo: (amount: string, destination: string) => `${amount} to ${destination}`,
    edit: "Edit",
    editAmountOrAccount: "Edit amount or account",
    submitWithdrawal: "Submit withdrawal",
    sendingRequest: "Sending request",
    withdrawRequestedTitle: "Withdrawal requested",
    withdrawRequestedBody:
      "The amount is set aside from your balance while an admin reviews it. If it’s rejected, the money goes back to your wallet.",
    receivingAccount: "Receiving account",
    balanceNow: "Balance now",

    // ── Subscribe dialog ──
    premiumUntilNote: (date: string) => `You’re Premium until ${date}. A new plan adds its days on top.`,
    shortBy: (amount: string) => `${amount} short`,
    needMore: (amount: string, plan: string) => `You need ${amount} more for ${plan}.`,
    cheapestPlan: (amount: string) =>
      `Insufficient balance. Top up your wallet first: the cheapest plan is ${amount}.`,
    addMoney: "Add money",
    plansError: "Couldn’t load the plans",
    loadingPlans: "Loading plans",
    subscribedTitle: "Subscription activated",
    premiumRunsUntil: (date: string) => `Premium runs until ${date}. Enjoy every movie and series.`,
    premiumActive: "Premium is active. Enjoy every movie and series.",
    subscribedToPlan: (plan: string) => `You’re now subscribed to ${plan}. Enjoy every movie and series.`,
    subscriptionFailed: "Subscription failed",
    plan: "Plan",
    paidFromWallet: "Paid from wallet",
    browsePremium: "Browse Premium",

    // ── Transactions page ──
    filters: "Filters",
    searchTransactions: "Search transactions",
    typeGroup: "Type",
    countAll: (count: number) => `${count} ${count === 1 ? "transaction" : "transactions"}`,
    countMatches: (count: number) => `${count} ${count === 1 ? "match" : "matches"} on this page`,
    loadingTransactionsLine: "Loading transactions…",
    clearFilters: "Clear filters",
    noMatchesTitle: "No matching transactions",
    noMatchesBody: "Try another type or search term.",
    colTransaction: "Transaction",
    colType: "Type",
    colDate: "Date",
    colStatus: "Status",
    colAmount: "Amount",
    tableLabel: (page: number, total: number) => `Wallet transactions, page ${page} of ${total}`,
    pages: "Pages",
    previousPage: "Previous page",
    nextPage: "Next page",
    pageN: (page: number) => `Page ${page}`,
  },
  mm: {
    // ── Wallet hero ──
    availableBalance: "သုံးနိုင်သော လက်ကျန်ငွေ",
    showBalance: "လက်ကျန်ငွေ ပြရန်",
    hideBalance: "လက်ကျန်ငွေ ဖျောက်ရန်",
    loadingBalance: "လက်ကျန်ငွေ ဖွင့်နေသည်",
    balanceError: "လက်ကျန်ငွေကို ဖွင့်၍ မရပါ",
    balanceErrorHint: "ထပ်ကြိုးစားနေစဉ်အတွင်း ငွေဖြည့်ခြင်း သို့မဟုတ် ငွေထုတ်ခြင်းကို ဆက်လုပ်နိုင်ပါသည်။",
    holdLine: (amount: string, count: number) =>
      `စောင့်ဆိုင်းဆဲ ငွေထုတ်မှု ${count} ခုအတွက် ${amount} ကို ဖယ်ထားပါသည်`,
    history: "မှတ်တမ်း",

    // ── Recent transactions panel ──
    seeAllTransactions: "မှတ်တမ်းအားလုံး ကြည့်ရန်",
    showLabel: "ပြသရန်",
    tabAll: "အားလုံး",
    awaitingApproval: "အတည်ပြုချက် စောင့်ဆိုင်းဆဲ",
    today: "ယနေ့",
    yesterday: "မနေ့က",
    listError: "ဤစာရင်းကို ဖွင့်၍ မရပါ",
    loadingTransactions: "မှတ်တမ်းများ ဖွင့်နေသည်",
    totals: "စုစုပေါင်း",

    // ── Right column ──
    waysToDeposit: "ငွေဖြည့်နိုင်သော နည်းလမ်းများ",
    waysToDepositBody: "သင့်ကိုယ်ပိုင်အကောင့်မှ ငွေလွှဲပြီး ဂဏန်း ၆ လုံး ငွေလွှဲကုဒ်ကို ထည့်ပါ။",
    depositWith: (method: string) => `${method} ဖြင့် ငွေဖြည့်ရန်`,
    toAccount: (name: string) => `${name} သို့`,
    accountsCount: (count: number) => `ရွေးချယ်နိုင်သော အကောင့် ${count} ခု`,

    // ── Deposit dialog ──
    depositFunds: "ငွေဖြည့်သွင်းရန်",
    depositStep1: "အဆင့် 1 / 2 · ပမာဏနှင့် ငွေပေးချေမှုနည်းလမ်း",
    depositStep2: "အဆင့် 2 / 2 · ငွေလွှဲပြီး အတည်ပြုပါ",
    requestSent: "တောင်းဆိုမှု ပို့ပြီးပါပြီ",
    amount: "ပမာဏ",
    quickAmounts: "အမြန်ရွေးရန် ပမာဏများ",
    loadingMethods: "ငွေပေးချေမှုနည်းလမ်းများ ဖွင့်နေသည်",
    tryLater: "နောက်မှ ထပ်ကြိုးစားပါ။",
    nextStepNote:
      "ထို့နောက် ဤအကောင့်သို့ ငွေလွှဲပြီး ပြေစာပါ ဂဏန်း ၆ လုံး ငွေလွှဲကုဒ်ကို ထည့်ပါ။ ဝန်ထမ်းများက ငွေလွှဲမှုကို အတည်ပြုပြီးမှ သင့်လက်ကျန်ငွေ ပြောင်းလဲပါမည်။",
    change: "ပြောင်းရန်",
    changeAmountOrMethod: "ပမာဏ သို့မဟုတ် ငွေပေးချေမှုနည်းလမ်း ပြောင်းရန်",
    sendToMethod: (method: string) => `${method} သို့ ငွေလွှဲရန်`,
    accountNumber: "အကောင့်နံပါတ်",
    copy: "ကူးယူရန်",
    copiedStatus: "အကောင့်နံပါတ် ကူးယူပြီးပါပြီ",
    sendExactly: (amount: string, method: string) =>
      `သင့်ကိုယ်ပိုင် ${method} အကောင့်မှ ${amount} အတိအကျ လွှဲပြီး ပြေစာပါ ငွေလွှဲကုဒ်ကို အောက်တွင် ရိုက်ထည့်ပါ။`,
    referenceHelp: (method: string) => `${method} ငွေလွှဲပြေစာမှ ဂဏန်း ၆ လုံးကုဒ်။`,
    referenceError: (method: string) => `${method} ပြေစာမှ ဂဏန်း ၆ လုံး ငွေလွှဲကုဒ်ကို အတိအကျ ထည့်ပါ။`,
    continue: "ဆက်လုပ်ရန်",
    submittingDeposit: "ငွေဖြည့်မှု တင်သွင်းနေသည်",
    depositSubmittedTitle: "ငွေဖြည့်မှု တင်သွင်းပြီးပါပြီ",
    depositSubmittedBody:
      "အက်ဒမင်၏ အတည်ပြုချက်ကို စောင့်ဆိုင်းနေပါသည်။ စစ်ဆေးပြီးသည်နှင့် သင့်လက်ကျန်ငွေ ပြောင်းလဲမည်ဖြစ်ပြီး အကြောင်းကြားချက် ရရှိပါမည်။",
    sentTo: "လွှဲခဲ့သည့်အကောင့်",
    reference: "ငွေလွှဲကုဒ်",
    status: "အခြေအနေ",
    viewHistory: "မှတ်တမ်း ကြည့်ရန်",

    // ── Withdraw dialog ──
    withdrawFunds: "ငွေထုတ်ယူရန်",
    withdrawStep1: "အဆင့် 1 / 2 · ပမာဏနှင့် အကောင့်",
    withdrawStepCode: "အဆင့် 2 / 2 · သင့်ကုဒ်ဖြင့် အတည်ပြုပါ",
    withdrawStepCreate: "အဆင့် 2 / 2 · ငွေထုတ်ကုဒ် ဖန်တီးပါ",
    withdrawStepReset: "အဆင့် 2 / 2 · ငွေထုတ်ကုဒ် ပြန်သတ်မှတ်ပါ",
    withdrawSummaryTo: (amount: string, destination: string) =>
      `${amount} ကို ${destination} သို့ ထုတ်ယူရန် တောင်းဆိုနေပါသည်။`,
    withdrawing: "ထုတ်ယူမည့်ငွေ",
    amountTo: (amount: string, destination: string) => `${destination} သို့ ${amount}`,
    edit: "ပြင်ရန်",
    editAmountOrAccount: "ပမာဏ သို့မဟုတ် အကောင့် ပြင်ရန်",
    submitWithdrawal: "ငွေထုတ်မှု တင်သွင်းရန်",
    sendingRequest: "တောင်းဆိုမှု ပို့နေသည်",
    withdrawRequestedTitle: "ငွေထုတ် တောင်းဆိုပြီးပါပြီ",
    withdrawRequestedBody:
      "အက်ဒမင် စစ်ဆေးနေစဉ် ထိုပမာဏကို သင့်လက်ကျန်ငွေမှ ဖယ်ထားပါသည်။ ငြင်းပယ်ခံရပါက ငွေကို သင့်ပိုက်ဆံအိတ်ထဲ ပြန်ထည့်ပေးပါမည်။",
    receivingAccount: "ငွေလက်ခံမည့်အကောင့်",
    balanceNow: "လက်ရှိ လက်ကျန်ငွေ",

    // ── Subscribe dialog ──
    premiumUntilNote: (date: string) =>
      `သင်သည် ${date} အထိ Premium ဖြစ်ပါသည်။ အစီအစဉ်အသစ်၏ ရက်များကို ထပ်ပေါင်းပေးပါမည်။`,
    shortBy: (amount: string) => `${amount} လိုသေးသည်`,
    needMore: (amount: string, plan: string) => `${plan} အတွက် ${amount} ထပ်လိုအပ်ပါသည်။`,
    cheapestPlan: (amount: string) =>
      `လက်ကျန်ငွေ မလုံလောက်ပါ။ ပိုက်ဆံအိတ်ကို အရင်ငွေဖြည့်ပါ — အသက်သာဆုံး အစီအစဉ်မှာ ${amount} ဖြစ်ပါသည်။`,
    addMoney: "ငွေဖြည့်ရန်",
    plansError: "အစီအစဉ်များကို ဖွင့်၍ မရပါ",
    loadingPlans: "အစီအစဉ်များ ဖွင့်နေသည်",
    subscribedTitle: "စာရင်းသွင်းမှု အသက်ဝင်ပါပြီ",
    premiumRunsUntil: (date: string) =>
      `${date} အထိ Premium ရရှိပါမည်။ ဇာတ်ကားနှင့် ဇာတ်လမ်းတွဲတိုင်းကို ကြည့်ရှုနိုင်ပါပြီ။`,
    premiumActive: "Premium အသက်ဝင်ပါပြီ။ ဇာတ်ကားနှင့် ဇာတ်လမ်းတွဲတိုင်းကို ကြည့်ရှုနိုင်ပါပြီ။",
    subscribedToPlan: (plan: string) =>
      `${plan} ကို စာရင်းသွင်းပြီးပါပြီ။ ဇာတ်ကားနှင့် ဇာတ်လမ်းတွဲတိုင်းကို ကြည့်ရှုနိုင်ပါပြီ။`,
    subscriptionFailed: "စာရင်းသွင်း၍ မရပါ",
    plan: "အစီအစဉ်",
    paidFromWallet: "ပိုက်ဆံအိတ်မှ ပေးချေငွေ",
    browsePremium: "Premium ဇာတ်ကားများ ကြည့်ရန်",

    // ── Transactions page ──
    filters: "စစ်ထုတ်မှုများ",
    searchTransactions: "မှတ်တမ်းများ ရှာရန်",
    typeGroup: "အမျိုးအစား",
    countAll: (count: number) => `မှတ်တမ်း ${count} ခု`,
    countMatches: (count: number) => `ဤစာမျက်နှာတွင် ကိုက်ညီမှု ${count} ခု`,
    loadingTransactionsLine: "မှတ်တမ်းများ ဖွင့်နေသည်…",
    clearFilters: "စစ်ထုတ်မှုများ ရှင်းရန်",
    noMatchesTitle: "ကိုက်ညီသော မှတ်တမ်း မရှိပါ",
    noMatchesBody: "အခြား အမျိုးအစား သို့မဟုတ် ရှာဖွေစကားလုံးကို စမ်းကြည့်ပါ။",
    colTransaction: "ငွေလွှဲမှု",
    colType: "အမျိုးအစား",
    colDate: "ရက်စွဲ",
    colStatus: "အခြေအနေ",
    colAmount: "ပမာဏ",
    tableLabel: (page: number, total: number) => `ပိုက်ဆံအိတ် မှတ်တမ်းများ၊ စာမျက်နှာ ${page} / ${total}`,
    pages: "စာမျက်နှာများ",
    previousPage: "ယခင် စာမျက်နှာ",
    nextPage: "နောက် စာမျက်နှာ",
    pageN: (page: number) => `စာမျက်နှာ ${page}`,
  },
});

export type WalletText = (typeof walletText)["en"];
