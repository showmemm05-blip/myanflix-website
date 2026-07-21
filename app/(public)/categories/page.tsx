"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { useCategories } from "@/hooks/use-movies";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">Explore movies by genre and origin.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)
          : categories?.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.id}`}
                className="glass-card group flex flex-col gap-2 rounded-xl border-white/[0.08] p-4 transition-colors hover:bg-secondary/40"
              >
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <p className="font-semibold">{category.name}</p>
                </div>
                {category.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{category.description}</p>
                )}
                <p className="mt-auto text-xs text-muted-foreground">{category.movieCount} movies</p>
              </Link>
            ))}
      </div>
    </div>
  );
}
