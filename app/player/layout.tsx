import { AppShell } from "@/components/layout/AppShell";

/**
 * The player runs in the same shell as every other route — the rail on desktop,
 * the tab bar on phones — minus the Footer: nothing should sit below an
 * unbounded episode list mid-binge.
 */
export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell showFooter={false}>{children}</AppShell>;
}
