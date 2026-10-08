import { defineSection } from "./define";

/**
 * New strings for the Marquee sign-in pages (/login, /register,
 * /forgot-password) and the Privacy page. Everything the old pages already
 * said is still read from translations.ts (t.auth.*, t.privacy.*,
 * t.nav.peakViewers…); only the words the new boards add live here.
 */
export const authText = defineSection({
  en: {
    // The artwork panel (desktop only).
    panelLabel: "MyanFlix",
    panelBody:
      "Films, series and books in one place, in English and မြန်မာ. Top up your wallet with KBZPay or WavePay.",

    // The step rail.
    stepsSignIn: "Sign-in steps",
    stepsSignUp: "Sign-up steps",
    stepsReset: "Password reset steps",
    stepDone: (label: string) => `${label}, done`,
    stepCurrent: (label: string) => `${label}, current step`,

    // Phone step.
    phonePlaceholder: "9xx xxx xxxx",
    phoneHelp: "Myanmar number, country code +95. Typing it as 09… works too.",
    signInFootnote:
      "One number covers both signing in and signing up. New numbers go straight to creating a password.",
    signUpFootnote: "Already registered? Enter the same number and we ask for your password instead.",
    checkingNumber: "Checking your number",

    // Password step (existing number).
    passwordSubtitle: "Enter the password for this number.",
    passwordFootnote: "Next you choose how to get a 6-digit code. Entering it finishes signing in.",
    checkingPassword: "Checking your password",

    // Create-password step (new number).
    createSubtitle: "This number isn't registered yet. Choose a password to continue.",
    createFootnote:
      "Your account is created when you enter the 6-digit code on the next step. You'll need this password next time you sign in.",
    passwordHelp: "At least 8 characters.",

    // Show / hide password buttons.
    showPassword: "Show password",
    showNewPassword: "Show new password",
    showConfirmPassword: "Show password confirmation",

    // The number chip ("+95 9 781 234 567 · Change").
    change: "Change",
    chipSigningIn: (phone: string) => `Signing in as ${phone}. Change phone number`,
    chipCreating: (phone: string) => `Creating an account for ${phone}. Change phone number`,
    chipResetting: (phone: string) => `Resetting the password for ${phone}. Change phone number`,

    // Get your code / enter the code.
    passwordAccepted: "Password accepted. The code is the last step.",
    passwordChosen: "Password chosen. Entering the code creates your account.",
    codeTitle: "Enter the code",
    smsSampleLabel: "Your text will look like this",
    smsSample: "MyanFlix: 482 913",
    codeLabel: "6-digit code",
    codeHelp: "Paste the whole text if you like. Only the digits are kept.",
    verifying: "Verifying",

    // Forgot password.
    resetCodeTitle: "Choose a new password",
    resetCodeHint: (phone: string) =>
      `A 6-digit code was requested for ${phone}. Enter it with your new password.`,
    savingPassword: "Saving new password",

    // Under every sign-in form.
    privacyBefore: "How we use your phone number is set out in our ",
    privacyLink: "Privacy Policy",
    privacyAfter: ".",

    // Privacy page.
    privacyLanguage: "Read this policy in",
    onThisPage: "On this page",
    sectionCount: (count: number) => `${count} sections`,
    contactTitle: "Questions about your privacy?",
    contactBody: "Write to us at [YOUR SUPPORT E-MAIL], or use Help & feedback at the bottom of any page.",
    backToTop: "Back to top",

    /**
     * The form checks' own sentences (lib/validation/auth.ts writes them in
     * English), shown in the reader's language. Keyed by the exact English
     * sentence; anything not listed is shown as written.
     */
    validation: {
      "Phone number is required": "Phone number is required",
      "Enter a valid phone number": "Enter a valid phone number",
      "Enter the code": "Enter the code",
      "Enter the 6-digit code": "Enter the 6-digit code",
      "Code must be 6 digits": "Code must be 6 digits",
      "Password is required": "Password is required",
      "Password must be at least 8 characters": "Password must be at least 8 characters",
      "Please confirm your password": "Please confirm your password",
      "Passwords don't match": "Passwords don't match",
      "Password must be 72 characters or fewer": "Password must be 72 characters or fewer",
    } as Record<string, string>,
  },
  mm: {
    panelLabel: "MyanFlix",
    panelBody:
      "ရုပ်ရှင်၊ ဇာတ်လမ်းတွဲနှင့် စာအုပ်များကို English နှင့် မြန်မာ ဘာသာဖြင့် တစ်နေရာတည်းတွင် ကြည့်ရှုဖတ်ရှုနိုင်ပါသည်။ KBZPay သို့မဟုတ် WavePay ဖြင့် ပိုက်ဆံအိတ်ကို ငွေဖြည့်နိုင်ပါသည်။",

    stepsSignIn: "ဝင်ရောက်ရန် အဆင့်များ",
    stepsSignUp: "အကောင့်ဖွင့်ရန် အဆင့်များ",
    stepsReset: "စကားဝှက် ပြန်သတ်မှတ်ရန် အဆင့်များ",
    stepDone: (label: string) => `${label}၊ ပြီးပါပြီ`,
    stepCurrent: (label: string) => `${label}၊ လက်ရှိအဆင့်`,

    phonePlaceholder: "9xx xxx xxxx",
    phoneHelp: "မြန်မာဖုန်းနံပါတ်၊ နိုင်ငံကုဒ် +95။ 09… ဖြင့် ရိုက်ထည့်လည်း ရပါသည်။",
    signInFootnote:
      "နံပါတ်တစ်ခုတည်းဖြင့် ဝင်ရောက်ခြင်းနှင့် အကောင့်ဖွင့်ခြင်း နှစ်မျိုးလုံး လုပ်နိုင်ပါသည်။ နံပါတ်အသစ်ဆိုလျှင် စကားဝှက် သတ်မှတ်သည့်အဆင့်သို့ တိုက်ရိုက် ရောက်သွားပါမည်။",
    signUpFootnote: "အကောင့် ရှိပြီးသားလား? နံပါတ်တူကိုပင် ထည့်ပါ၊ စကားဝှက်ကို မေးပါမည်။",
    checkingNumber: "သင့်နံပါတ်ကို စစ်ဆေးနေသည်",

    passwordSubtitle: "ဤနံပါတ်၏ စကားဝှက်ကို ထည့်ပါ။",
    passwordFootnote:
      "နောက်တစ်ဆင့်တွင် ဂဏန်း ၆ လုံးကုဒ်ကို မည်သို့ ရယူမည်ကို ရွေးချယ်ပါမည်။ ထိုကုဒ်ကို ထည့်လိုက်သည်နှင့် ဝင်ရောက်ခြင်း ပြီးဆုံးပါမည်။",
    checkingPassword: "သင့်စကားဝှက်ကို စစ်ဆေးနေသည်",

    createSubtitle: "ဤနံပါတ်ဖြင့် အကောင့် မဖွင့်ရသေးပါ။ ဆက်လုပ်ရန် စကားဝှက်တစ်ခု ရွေးချယ်ပါ။",
    createFootnote:
      "နောက်တစ်ဆင့်တွင် ဂဏန်း ၆ လုံးကုဒ်ကို ထည့်လိုက်သည်နှင့် သင့်အကောင့် ဖွင့်ပြီးပါမည်။ နောက်တစ်ကြိမ် ဝင်ရောက်ရာတွင် ဤစကားဝှက် လိုအပ်ပါမည်။",
    passwordHelp: "အနည်းဆုံး စာလုံး ၈ လုံး။",

    showPassword: "စကားဝှက်ကို ပြရန်",
    showNewPassword: "စကားဝှက်အသစ်ကို ပြရန်",
    showConfirmPassword: "အတည်ပြု စကားဝှက်ကို ပြရန်",

    change: "ပြောင်းရန်",
    chipSigningIn: (phone: string) => `${phone} ဖြင့် ဝင်ရောက်နေသည်။ ဖုန်းနံပါတ် ပြောင်းရန်`,
    chipCreating: (phone: string) => `${phone} အတွက် အကောင့်ဖွင့်နေသည်။ ဖုန်းနံပါတ် ပြောင်းရန်`,
    chipResetting: (phone: string) => `${phone} ၏ စကားဝှက်ကို ပြန်သတ်မှတ်နေသည်။ ဖုန်းနံပါတ် ပြောင်းရန်`,

    passwordAccepted: "စကားဝှက် မှန်ကန်ပါသည်။ ကုဒ်သည် နောက်ဆုံးအဆင့် ဖြစ်ပါသည်။",
    passwordChosen: "စကားဝှက် ရွေးချယ်ပြီးပါပြီ။ ကုဒ်ကို ထည့်လိုက်သည်နှင့် သင့်အကောင့် ဖွင့်ပြီးပါမည်။",
    codeTitle: "ကုဒ်ကို ထည့်ပါ",
    smsSampleLabel: "သင်ရရှိမည့် စာတို ပုံစံ",
    smsSample: "MyanFlix: 482 913",
    codeLabel: "ဂဏန်း ၆ လုံးကုဒ်",
    codeHelp: "စာတိုတစ်ခုလုံးကို ကူးထည့်လည်း ရပါသည်။ ဂဏန်းများကိုသာ ယူပါမည်။",
    verifying: "အတည်ပြုနေသည်",

    resetCodeTitle: "စကားဝှက်အသစ် ရွေးချယ်ပါ",
    resetCodeHint: (phone: string) =>
      `${phone} အတွက် ဂဏန်း ၆ လုံးကုဒ် တောင်းဆိုပြီးပါပြီ။ ထိုကုဒ်နှင့်အတူ စကားဝှက်အသစ်ကို ထည့်ပါ။`,
    savingPassword: "စကားဝှက်အသစ်ကို သိမ်းနေသည်",

    privacyBefore: "သင့်ဖုန်းနံပါတ်ကို ကျွန်ုပ်တို့ မည်သို့ အသုံးပြုသည်ကို ",
    privacyLink: "ကိုယ်ရေးကိုယ်တာမူဝါဒ",
    privacyAfter: " တွင် ဖော်ပြထားပါသည်။",

    privacyLanguage: "ဤမူဝါဒကို ဖတ်ရှုမည့် ဘာသာ",
    onThisPage: "ဤစာမျက်နှာတွင်",
    sectionCount: (count: number) =>
      `ကဏ္ဍ ${String(count).replace(/[0-9]/g, (digit) => String.fromCharCode(0x1040 + Number(digit)))} ခု`,
    contactTitle: "ကိုယ်ရေးကိုယ်တာဆိုင်ရာ မေးခွန်းများ ရှိပါသလား?",
    contactBody:
      "[YOUR SUPPORT E-MAIL] သို့ ရေးသားပေးပို့ပါ၊ သို့မဟုတ် စာမျက်နှာတိုင်း၏ အောက်ခြေရှိ “အကူအညီနှင့် အကြံပြုချက်” ကို အသုံးပြုပါ။",
    backToTop: "အပေါ်သို့",

    validation: {
      "Phone number is required": "ဖုန်းနံပါတ် ထည့်ရန် လိုအပ်ပါသည်",
      "Enter a valid phone number": "မှန်ကန်သော ဖုန်းနံပါတ်ကို ထည့်ပါ",
      "Enter the code": "ကုဒ်ကို ထည့်ပါ",
      "Enter the 6-digit code": "ဂဏန်း ၆ လုံးကုဒ်ကို ထည့်ပါ",
      "Code must be 6 digits": "ကုဒ်သည် ဂဏန်း ၆ လုံး ဖြစ်ရပါမည်",
      "Password is required": "စကားဝှက် ထည့်ရန် လိုအပ်ပါသည်",
      "Password must be at least 8 characters": "စကားဝှက်သည် အနည်းဆုံး စာလုံး ၈ လုံး ရှိရပါမည်",
      "Please confirm your password": "စကားဝှက်ကို အတည်ပြုပါ",
      "Passwords don't match": "စကားဝှက်များ မတူညီပါ",
      "Password must be 72 characters or fewer": "စကားဝှက်သည် စာလုံး ၇၂ လုံးထက် မပိုရပါ",
    } as Record<string, string>,
  },
});

/** A form check's sentence in the reader's language (unknown sentences pass through). */
export function validationMessage(
  strings: { validation: Record<string, string> },
  message: string | undefined,
): string | undefined {
  if (!message) return message;
  return strings.validation[message] ?? message;
}

/**
 * The smallest country-code form of a Myanmar mobile: "95" + "9" + 7 digits.
 * Every national number typed without its 0 is shorter when it starts "95"
 * (the 09 5… range is 9 + 7 digits = 8), so length tells the two apart.
 */
const MIN_COUNTRY_CODE_DIGITS = 10;

/**
 * The typed phone number in a form the server reads the way the person
 * meant it. The box shows a fixed "+95", so most people type the number
 * WITHOUT its leading 0 ("9 781 234 567"). The server, though, reads a
 * leading "95" as the country code — so "95 123 456" (a real 09 5… number)
 * would turn into a different, wrong number. To stop that, a number typed
 * with no "+" and no leading 0 gets its 0 back ("0951 23456"), unless it is
 * long enough to be the full "959…" country-code form, which gets a "+".
 * Spaces and dashes (only there for reading) are dropped. Typing "09…" or
 * "+959…" is sent exactly as before.
 */
export function normalizeTypedPhone(raw: string): string {
  const compact = raw.replace(/[\s-]/g, "");
  // Empty, already international, already national, or not all digits (the
  // form check rejects that one with its own message): leave it alone.
  if (!/^\d+$/.test(compact) || compact.startsWith("0")) return compact;
  if (compact.startsWith("95") && compact.length >= MIN_COUNTRY_CODE_DIGITS) return `+${compact}`;
  return `0${compact}`;
}

/**
 * "+95 9 781 234 567" — how a typed Myanmar number is shown back on the
 * number chip. Display only. It reads the number by the same rule as
 * normalizeTypedPhone, so the chip always shows the number that is sent.
 * A number with another country code is shown as typed.
 */
export function formatMyanmarPhone(raw: string): string {
  const dialable = normalizeTypedPhone(raw);
  if (dialable.startsWith("+") && !dialable.startsWith("+95")) return dialable;
  let digits = dialable.replace(/\D/g, "");
  if (dialable.startsWith("+95")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits) return raw;
  const groups = [digits.slice(0, 1), digits.slice(1, 4), digits.slice(4, 7), digits.slice(7)].filter(Boolean);
  return `+95 ${groups.join(" ")}`;
}
