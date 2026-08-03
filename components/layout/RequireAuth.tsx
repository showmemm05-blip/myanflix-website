"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { PageLoader } from "@/components/loading/Spinner";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for the initial session restore (GET /profile using the stored
    // token) to finish before deciding — on a fresh page load isAuthenticated
    // starts false while that request is still in flight, and redirecting
    // on that transient state bounces an already-logged-in user to /login.
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return <PageLoader />;

  return <>{children}</>;
}
