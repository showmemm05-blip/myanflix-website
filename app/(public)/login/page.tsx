"use client";

import Link from "next/link";
import { Film } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground glow-primary">
            <Film className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gradient-brand">
            MyanFlix
          </span>
        </div>

        <Card className="glass-card border-white/[0.08]">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in with your phone number to continue watching.</CardDescription>
          </CardHeader>
          <CardContent>
            <PhoneAuthForm />

            <p className="mt-4 text-center text-sm text-muted-foreground">
              New to MyanFlix?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
