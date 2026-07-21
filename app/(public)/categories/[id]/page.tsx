"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { EmptyState } from "@/components/empty/EmptyState";
import { PageLoader } from "@/components/loading/Spinner";
import { useCategory, useMovies } from "@/hooks/use-movies";

export default function CategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: category, isLoading: isCategoryLoading } = useCategory(id);
  const { data, isLoading: isMoviesLoading } = useMovies({ categoryId: category?.id, limit: 60 });

  if (isCategoryLoading) return <PageLoader />;

  if (!category) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={Layers}
          title="Category not found"
          action={
            <Button render={<Link href="/categories" />} nativeButton={false}>
              Back to Categories
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <Button variant="ghost" size="sm" render={<Link href="/categories" />} nativeButton={false} className="mb-4">
        <ArrowLeft className="size-4" />
        All Categories
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{category.name}</h1>
        {category.description && <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>}
      </div>

      {!isMoviesLoading && data?.items.length === 0 ? (
        <EmptyState icon={Layers} title="No movies in this category yet" />
      ) : (
        <MovieGrid movies={data?.items ?? []} isLoading={isMoviesLoading} />
      )}
    </div>
  );
}
