"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCrossLink, AuthLayout } from "@/components/auth/AuthLayout";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { useLanguage } from "@/lib/context/language-context";
import { loginHref, safeReturnTo } from "@/lib/auth/return-to";

/** Sign up (Register + LoginCode boards) — the same flow as /login, opened with sign-up words. */
export default function RegisterPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      footer={
        <>
          {t.auth.haveAccount}{" "}
          <Suspense
            fallback={<AuthCrossLink href="/login">{t.auth.signInLink}</AuthCrossLink>}
          >
            <SignInLink label={t.auth.signInLink} />
          </Suspense>
        </>
      }
    >
      {/* useSearchParams needs its own Suspense boundary so the rest of the
          page can still be prerendered. */}
      <Suspense fallback={<PhoneAuthForm mode="signUp" />}>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}

/** Reads `?next=` so a guest bounced off a watch wall lands back on it after signing up. */
function RegisterForm() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("next"));
  return <PhoneAuthForm mode="signUp" returnTo={returnTo} />;
}

/** Carries `?next=` across to /login so switching forms never loses the destination. */
function SignInLink({ label }: { label: string }) {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("next"));
  return (
    <AuthCrossLink href={returnTo ? loginHref(returnTo) : "/login"}>{label}</AuthCrossLink>
  );
}
