import { AppShell } from "@/components/layout/AppShell";

/**
 * The player runs inside AppShell (skip link, `<main>`, the shared feedback
 * dialog), which recognises /player as a full-screen route and draws no top
 * bar, dock or footer around it — the player brings its own back button.
 */
export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell showFooter={false}>{children}</AppShell>;
}
