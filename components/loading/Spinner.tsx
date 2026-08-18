import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-primary", className)} />;
}

/**
 * Route-level loading. The aurora wash behind the spinner means a slow page
 * still looks like the product rather than like a blank screen.
 */
export function PageLoader() {
  return (
    <div className="relative isolate flex min-h-[60vh] items-center justify-center overflow-hidden">
      <div aria-hidden className="aurora-wash-soft pointer-events-none absolute inset-0 -z-10 opacity-40 blur-3xl" />
      <Spinner className="size-8" />
    </div>
  );
}
