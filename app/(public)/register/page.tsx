"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { useLanguage } from "@/lib/context/language-context";
import { loginHref, safeReturnTo } from "@/lib/auth/return-to";

export default function RegisterPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      kicker={t.auth.createOne}
      title={t.auth.registerTitle}
      subtitle={t.auth.registerSubtitle}
      footer={
        <>
          {t.auth.haveAccount}{" "}
          <Suspense
            fallback={
              <Link
                href="/login"
                className="focus-ring rounded-md font-medium text-primary hover:underline"
              >
                {t.auth.signInLink}
              </Link>
            }
          >
            <SignInLink label={t.auth.signInLink} />
          </Suspense>
        </>
      }
    >
      {/* useSearchParams needs its own Suspense boundary so the rest of the
          page can still be prerendered. */}
      <Suspense fallback={<PhoneAuthForm />}>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}

/** Reads `?next=` so a guest bounced off a watch wall lands back on it after signing up. */
function RegisterForm() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("next"));
  return <PhoneAuthForm returnTo={returnTo} />;
}

/** Carries `?next=` across to /login so switching forms never loses the destination. */
function SignInLink({ label }: { label: string }) {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("next"));
  return (
    <Link
      href={returnTo ? loginHref(returnTo) : "/login"}
      className="focus-ring rounded-md font-medium text-primary hover:underline"
    >
      {label}
    </Link>
  );
}
