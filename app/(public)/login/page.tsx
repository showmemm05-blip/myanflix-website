"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { useLanguage } from "@/lib/context/language-context";
import { safeReturnTo } from "@/lib/auth/return-to";

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      kicker={t.nav.signIn}
      title={t.auth.signInTitle}
      subtitle={t.auth.signInSubtitle}
      footer={
        <>
          {t.auth.noAccount}{" "}
          <Suspense
            fallback={
              <Link
                href="/register"
                className="focus-ring rounded-md font-medium text-primary hover:underline"
              >
                {t.auth.createOne}
              </Link>
            }
          >
            <RegisterLink label={t.auth.createOne} />
          </Suspense>
        </>
      }
    >
      {/* useSearchParams needs its own Suspense boundary so the rest of the
          page can still be prerendered. */}
      <Suspense fallback={<PhoneAuthForm />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}

/** Reads `?next=` so a guest bounced off a watch wall lands back on it after signing in. */
function LoginForm() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("next"));
  return <PhoneAuthForm returnTo={returnTo} />;
}

/** Carries `?next=` across to /register so switching forms never loses the destination. */
function RegisterLink({ label }: { label: string }) {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("next"));
  const href = returnTo
    ? `/register?next=${encodeURIComponent(returnTo)}`
    : "/register";
  return (
    <Link
      href={href}
      className="focus-ring rounded-md font-medium text-primary hover:underline"
    >
      {label}
    </Link>
  );
}
