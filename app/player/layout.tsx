import { Navbar } from "@/components/navbar/Navbar";

/**
 * The player deliberately skips the Footer (nothing should sit below an
 * unbounded episode list mid-binge), but it keeps the Navbar so wallet,
 * notifications, and navigation stay one click away while watching.
 */
export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {children}
    </div>
  );
}
