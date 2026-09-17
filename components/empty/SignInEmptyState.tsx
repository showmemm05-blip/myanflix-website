"use client";

import Link from "next/link";
import { LogIn, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { loginHref } from "@/lib/auth/return-to";
import { useLanguage } from "@/lib/context/language-context";

/**
 * The one "this needs a session" empty state — a members-only shelf seen by
 * a guest. Same icon, copy treatment and outline Sign in button wherever it
 * appears, and the button carries the visitor back to `returnTo` after login.
 */
export function SignInEmptyState({
  icon,
  title,
  description,
  returnTo,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Same-origin path to come back to once signed in. */
  returnTo: string;
}) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        <Button
          variant="outline"
          className="h-10 rounded-full px-4"
          render={<Link href={loginHref(returnTo)} />}
          nativeButton={false}
        >
          <LogIn className="size-4" />
          {t.browse.signIn}
        </Button>
      }
    />
  );
}
