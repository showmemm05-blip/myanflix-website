"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation/auth";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (_values: ForgotPasswordValues) => {
    // No backend endpoint for this yet — the UI still completes the flow.
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSent(true);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground glow-primary">
            <Film className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gradient-brand">MyanFlix</span>
        </div>

        <Card className="glass-card border-white/[0.08]">
          {sent ? (
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <p className="font-semibold">Check your email</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&rsquo;ve sent a password reset link to {getValues("email")}.
                </p>
              </div>
              <Button variant="outline" render={<Link href="/login" />} nativeButton={false}>
                Back to sign in
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Reset your password</CardTitle>
                <CardDescription>Enter your email and we&rsquo;ll send you a reset link.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="mt-1">
                    {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                    Send reset link
                  </Button>
                </form>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
