/**
 * The phone number typed on one sign-in screen, carried to the next one
 * ("Forgot password?" from the password step, "Sign in" after a reset) so
 * nobody types it twice.
 *
 * Module memory only, on purpose: a phone number is personal data, so it is
 * never put in the URL (history, logs, referrers) or in browser storage. It
 * survives client-side navigation and is simply gone after a reload.
 */
let handedOffPhone: string | null = null;

export function handOffPhone(phone: string): void {
  handedOffPhone = phone;
}

export function handedOffPhoneOrEmpty(): string {
  return handedOffPhone ?? "";
}
