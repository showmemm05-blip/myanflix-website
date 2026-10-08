import { AppShell } from "@/components/layout/AppShell";
import { RealtimeWalletListener } from "@/components/layout/RealtimeWalletListener";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Signed-in visitors on public pages (Home, Media, titles…) also get
          the live wallet/notification updates, so the top bar's balance
          pill and bell never wait for a refresh. Does nothing for guests. */}
      <RealtimeWalletListener />
      <AppShell>{children}</AppShell>
    </>
  );
}
