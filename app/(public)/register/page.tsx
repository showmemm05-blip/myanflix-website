"use client";

import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { useLanguage } from "@/lib/context/language-context";

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
          <Link href="/login" className="focus-ring rounded-md font-medium text-primary hover:underline">
            {t.auth.signInLink}
          </Link>
        </>
      }
    >
      <PhoneAuthForm />
    </AuthLayout>
  );
}
