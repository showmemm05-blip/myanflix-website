import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { RealtimeWalletListener } from "@/components/layout/RealtimeWalletListener";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RealtimeWalletListener />
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
