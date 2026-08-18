"use client";

import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { useLanguage } from "@/lib/context/language-context";

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
          <Link href="/register" className="focus-ring rounded-md font-medium text-primary hover:underline">
            {t.auth.createOne}
          </Link>
        </>
      }
    >
      <PhoneAuthForm />
    </AuthLayout>
  );
}
