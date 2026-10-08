"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TransactionsView } from "@/components/views/TransactionsView";
import { paymentService } from "@/services/api/paymentService";
import type { TransactionTypeFilter } from "@/types/transaction";

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["transactions", page],
    queryFn: () => paymentService.getTransactions({ page, limit: PAGE_SIZE }),
  });

  // The header's balance — the same ["wallet-summary"] query the top bar's
  // pill and /wallet read, so it stays live with the realtime listener.
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
  });

  const filtered = (data?.items ?? []).filter((t) => {
    const matchesSearch = (t.movieTitle ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesType =
      typeFilter === "all" ||
      t.type === typeFilter ||
      // One combined chip covers both adjustment directions.
      (typeFilter === "ADJUSTMENTS" &&
        (t.type === "ADJUSTMENT_CREDIT" || t.type === "ADJUSTMENT_DEBIT"));
    return matchesSearch && matchesType;
  });
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <TransactionsView
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      typeFilter={typeFilter}
      onTypeFilterChange={(type) => {
        setTypeFilter(type);
        setPage(1);
      }}
      onClearFilters={() => {
        setSearch("");
        setTypeFilter("all");
        setPage(1);
      }}
      transactions={filtered}
      totalCount={data?.total ?? 0}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      balance={summary?.balance}
      isBalanceLoading={isSummaryLoading}
    />
  );
}
