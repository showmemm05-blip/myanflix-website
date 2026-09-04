"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleOAuthProvider, useGoogleLogin, useGoogleOAuth } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GOOGLE_CLIENT_ID, warnGoogleAuthUnconfiguredOnce } from "@/lib/auth/google-client-id";
import { useLanguage } from "@/lib/context/language-context";

/**
 * How long a click may wait for accounts.google.com to load before we give
 * up on it. The script normally lands well under a second; this only bites
 * when it is blocked (ad blocker, offline) — the button then reports a
 * failure instead of spinning forever.
 */
const SCRIPT_WAIT_MS = 4000;
// 4s, not longer: a deferred popup is opened from a timer, and browsers only
// honour window.open for ~5s after the user's click. Past that the popup
// would be blocked anyway, so we report a failure instead of a blocked popup.

/** The official four-colour "G" — inline so it paints with the button, no asset fetch. */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

interface GoogleButtonProps {
  disabled: boolean;
  busy: boolean;
  onCode: (code: string) => void;
  onError: () => void;
  /** Google's popup opened / closed — the parent locks the phone form while it is open. */
  onPopupChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Our own button driving Google's popup auth-code flow. It is a plain
 * <Button> from first paint — nothing here waits for Google's script; only
 * the click does, and only if it lands before the script has arrived.
 * Must sit inside GoogleOAuthProvider (useGoogleLogin/useGoogleOAuth).
 */
function GoogleButton({ disabled, busy, onCode, onError, onPopupChange, className }: GoogleButtonProps) {
  const { t } = useLanguage();
  const { scriptLoadedSuccessfully } = useGoogleOAuth();
  // A click that arrived before accounts.google.com loaded — fired the
  // moment the script reports ready (see the effect below).
  const [pending, setPending] = useState(false);
  // Google's popup is open: from the click until Google calls back (code,
  // cancel, or failure). Counts as busy so a second click cannot open a
  // second popup, and the parent can freeze the phone form meanwhile —
  // otherwise a phone submit in that window would silently drop the code.
  const [popupOpen, setPopupOpen] = useState(false);
  useEffect(() => {
    onPopupChange?.(popupOpen);
  }, [popupOpen, onPopupChange]);
  // Refs so the effect's timer isn't reset by the parent re-rendering with
  // fresh closures.
  const onCodeRef = useRef(onCode);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCodeRef.current = onCode;
    onErrorRef.current = onError;
  });

  const login = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "popup",
    onSuccess: ({ code }) => {
      setPopupOpen(false);
      if (code) onCodeRef.current(code);
      else onErrorRef.current();
    },
    // The user pressed "Cancel" on Google's consent screen — nothing went
    // wrong, so nothing to say.
    onError: ({ error }) => {
      setPopupOpen(false);
      if (error === "access_denied") return;
      onErrorRef.current();
    },
    // Likewise closing the popup. A popup that failed to *open* is a real
    // failure (blocked), and is reported.
    onNonOAuthError: ({ type }) => {
      setPopupOpen(false);
      if (type === "popup_closed") return;
      onErrorRef.current();
    },
  });

  useEffect(() => {
    if (!pending) return;
    if (scriptLoadedSuccessfully) {
      // useGoogleLogin's own effect (declared above, so it ran first this
      // commit) has already initialised the code client. Fired from a timer
      // so the state update happens in a callback, not in the effect body.
      const fire = setTimeout(() => {
        setPending(false);
        setPopupOpen(true);
        login();
      }, 0);
      return () => clearTimeout(fire);
    }
    const timer = setTimeout(() => {
      setPending(false);
      onErrorRef.current();
    }, SCRIPT_WAIT_MS);
    return () => clearTimeout(timer);
  }, [pending, scriptLoadedSuccessfully, login]);

  const waiting = busy || pending || popupOpen;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || waiting}
      aria-busy={waiting}
      className={className}
      onClick={() => {
        if (scriptLoadedSuccessfully) {
          setPopupOpen(true);
          login();
        } else setPending(true);
      }}
    >
      {waiting ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
      {t.auth.continueWithGoogle}
    </Button>
  );
}

/**
 * The "or / Continue with Google" block under the phone step.
 *
 * The button is ours (same pill as the phone submit, Google's "G" in the
 * icon slot) and renders on first paint. Clicking it opens Google's popup
 * (auth-code flow); Google hands the page a one-time code which the backend
 * exchanges and verifies server-side — no token ever reaches the browser.
 * The GoogleOAuthProvider is mounted here, not in the root layout, on
 * purpose: it injects the accounts.google.com script on mount, and this
 * keeps that script off the player and every other route.
 *
 * Renders nothing at all (divider included) when NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * is not baked into the bundle, so the phone form stands alone unchanged.
 */
export function GoogleSignIn({
  disabled,
  busy,
  onCode,
  onError,
  onPopupChange,
  className,
}: {
  /** Another sign-in (the phone check) is in flight — the button is disabled. */
  disabled: boolean;
  /** This sign-in is in flight — spinner in the icon slot, button disabled. */
  busy: boolean;
  /** Google handed the browser a one-time authorization code; exchange it for a session. */
  onCode: (code: string) => void;
  /** Google's script/popup failed, or the response carried no code. Never fired for a user cancel. */
  onError: () => void;
  /** Google's popup opened / closed — lock the phone form while it is open. */
  onPopupChange?: (open: boolean) => void;
  /** Extra classes for the button — the phone form passes its submit pill classes so both match. */
  className?: string;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) warnGoogleAuthUnconfiguredOnce();
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      {/* Same eyebrow treatment as the step labels above the form. */}
      <div
        role="separator"
        aria-label={t.auth.or}
        className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground"
      >
        <span aria-hidden className="h-px flex-1 bg-white/10" />
        {t.auth.or}
        <span aria-hidden className="h-px flex-1 bg-white/10" />
      </div>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <GoogleButton
          disabled={disabled}
          busy={busy}
          onCode={onCode}
          onError={onError}
          onPopupChange={onPopupChange}
          className={className}
        />
      </GoogleOAuthProvider>
    </>
  );
}
