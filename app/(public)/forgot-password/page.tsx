"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useLanguage } from "@/lib/context/language-context";
import { loginHref, safeReturnTo } from "@/lib/auth/return-to";

/** "Forgot password?" (H-8) — the same stage as /login, on the current code service. */
export default function ForgotPasswordPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      kicker={t.auth.reset.kicker}
      title={t.auth.reset.title}
      subtitle={t.auth.reset.subtitle}
      footer={
        <>
          {t.auth.reset.remembered}{" "}
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
      <Suspense fallback={<ForgotPasswordForm />}>
        <ResetForm />
      </Suspense>
    </AuthLayout>
  );
}

/** Carries `?next=` through, so signing in after the reset still lands where the guest was headed. */
function ResetForm() {
  const searchParams = useSearchParams();
  return <ForgotPasswordForm returnTo={safeReturnTo(searchParams.get("next"))} />;
}

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
