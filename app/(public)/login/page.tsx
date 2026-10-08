"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCrossLink, AuthLayout } from "@/components/auth/AuthLayout";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { useLanguage } from "@/lib/context/language-context";
import { safeReturnTo } from "@/lib/auth/return-to";

/** Sign in (Login + LoginCode boards): phone → password → "Get your code" → code. */
export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      footer={
        <>
          {t.auth.noAccount}{" "}
          <Suspense
            fallback={<AuthCrossLink href="/register">{t.auth.createOne}</AuthCrossLink>}
          >
            <RegisterLink label={t.auth.createOne} />
          </Suspense>
        </>
      }
    >
      {/* useSearchParams needs its own Suspense boundary so the rest of the
          page can still be prerendered. */}
      <Suspense fallback={<PhoneAuthForm mode="signIn" />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}

/** Reads `?next=` so a guest bounced off a watch wall lands back on it after signing in. */
function LoginForm() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("next"));
  return <PhoneAuthForm mode="signIn" returnTo={returnTo} />;
}

/** Carries `?next=` across to /register so switching forms never loses the destination. */
function RegisterLink({ label }: { label: string }) {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("next"));
  const href = returnTo
    ? `/register?next=${encodeURIComponent(returnTo)}`
    : "/register";
  return <AuthCrossLink href={href}>{label}</AuthCrossLink>;
}
