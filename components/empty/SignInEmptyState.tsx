"use client";

import type { ComponentType } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { LockIcon } from "@/components/system/icons";
import { loginHref } from "@/lib/auth/return-to";
import { useLanguage } from "@/lib/context/language-context";

/**
 * The one "this needs a session" state — a members-only shelf seen by a
 * guest (books, wallet, library). Same layout as EmptyState with a lock (or
 * your icon) and a white Sign in link that brings the visitor back to
 * `returnTo` after login.
 */
export function SignInEmptyState({
  icon = LockIcon,
  title,
  description,
  returnTo,
  framed = false,
}: {
  icon?: ComponentType<{ className?: string; size?: number }>;
  title: string;
  description: string;
  /** Same-origin path to come back to once signed in. */
  returnTo: string;
  framed?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      framed={framed}
      action={
        <Link href={loginHref(returnTo)} className={buttonVariants({ variant: "play", size: "cta" })}>
          {t.browse.signIn}
        </Link>
      }
    />
  );
}
