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
      transactions={filtered}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
    />
  );
}
