"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Loader2, TrendingDown, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import { TransactionRow } from "@/components/cards/TransactionRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paymentService } from "@/services/api/paymentService";
import { formatKyat } from "@/lib/currency";
import type { DepositMethod } from "@/types/transaction";
import { toast } from "sonner";

const DEPOSIT_METHODS: DepositMethod[] = ["KBZ Pay", "Wave Pay", "AYA Pay", "Visa/Mastercard"];
const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

export default function WalletPage() {
  const [depositOpen, setDepositOpen] = useState(false);
  const [amount, setAmount] = useState("10000");
  const [method, setMethod] = useState<DepositMethod>("KBZ Pay");
  const [isDepositing, setIsDepositing] = useState(false);

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
  });

  const { data: transactions, isLoading: isTxnLoading } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: () => paymentService.getTransactions({ limit: 5 }),
  });

  const handleDeposit = async () => {
    setIsDepositing(true);
    await paymentService.deposit(Number(amount), method);
    setIsDepositing(false);
    setDepositOpen(false);
    toast.success("Deposit successful (UI only)", { description: `${formatKyat(Number(amount))} via ${method}` });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Wallet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your balance and deposits.</p>
        </div>
        <Button onClick={() => setDepositOpen(true)}>
          <ArrowUpRight className="size-4" />
          Deposit
        </Button>
      </div>

      {isSummaryLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={WalletIcon} label="Current Balance" value={formatKyat(summary?.balance ?? 0)} />
          <StatCard icon={TrendingUp} label="Total Deposited" value={formatKyat(summary?.totalDeposited ?? 0)} />
          <StatCard icon={TrendingDown} label="Total Spent" value={formatKyat(summary?.totalSpent ?? 0)} />
        </div>
      )}

      <Card className="glass-card mt-6 border-white/[0.08]">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Transactions</CardTitle>
          <Button variant="ghost" size="sm" render={<Link href="/transactions" />} nativeButton={false}>
            View all
          </Button>
        </CardHeader>
        <CardContent>
          {isTxnLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            transactions?.items.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)
          )}
        </CardContent>
      </Card>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deposit funds</DialogTitle>
            <DialogDescription>This is a UI-only demo — no real payment is processed.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount (Ks)</Label>
              <Input id="amount" type="number" min="1000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(qa.toString())}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary"
                  >
                    {formatKyat(qa)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={(v) => v && setMethod(v as DepositMethod)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPOSIT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)} disabled={isDepositing}>
              Cancel
            </Button>
            <Button onClick={handleDeposit} disabled={isDepositing || Number(amount) <= 0}>
              {isDepositing && <Loader2 className="size-4 animate-spin" />}
              Deposit {formatKyat(Number(amount) || 0)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
