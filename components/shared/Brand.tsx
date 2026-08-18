import Link from "next/link";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one logo lockup — Navbar, MobileMenu, Footer, and the auth pages all
 * pointed three separate copies of this at slightly different sizes.
 */
export function Brand({
  size = "md",
  href = "/",
  wordmarkClassName,
}: {
  size?: "md" | "lg";
  href?: string | null;
  wordmarkClassName?: string;
}) {
  const mark = (
    <>
      <span
        className={cn(
          // Crimson is the logo color and only the logo color. The glow is what
          // keeps a small mark reading as lit rather than as a flat red square.
          "flex items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-[0_6px_20px_-6px_var(--brand)] ring-1 ring-white/15 ring-inset",
          size === "lg" ? "size-10" : "size-8",
        )}
      >
        <Film className={size === "lg" ? "size-5" : "size-4"} />
      </span>
      <span
        className={cn(
          "font-heading font-bold tracking-tight",
          size === "lg" ? "text-xl" : "text-lg",
          wordmarkClassName,
        )}
      >
        MyanFlix
      </span>
    </>
  );
  if (href === null) return <span className="flex items-center gap-2.5">{mark}</span>;
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {mark}
    </Link>
  );
}
