import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/footer/Footer";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { RealtimeWalletListener } from "@/components/layout/RealtimeWalletListener";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RealtimeWalletListener />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </RequireAuth>
  );
}
