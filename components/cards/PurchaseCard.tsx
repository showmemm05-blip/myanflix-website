import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKyat } from "@/lib/currency";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import type { PurchaseEntry } from "@/types/purchase";

export function PurchaseCard({ purchase }: { purchase: PurchaseEntry }) {
  return (
    <div className="glass-card flex gap-3 rounded-xl border-white/[0.08] p-3">
      <Link href={`/movie/${purchase.movieId}`} className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        <Image src={purchase.posterUrl ?? FALLBACK_POSTER_URL} alt={purchase.movieTitle} fill sizes="80px" className="object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <Link href={`/movie/${purchase.movieId}`} className="text-sm font-semibold hover:text-primary">
            {purchase.movieTitle}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            Purchased {new Date(purchase.purchasedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-xs text-muted-foreground">Paid {formatKyat(purchase.amount)}</p>
        </div>
        <Button size="sm" className="w-fit" render={<Link href={`/player/${purchase.movieId}`} />} nativeButton={false}>
          <Play className="size-3.5 fill-current" />
          Watch
        </Button>
      </div>
    </div>
  );
}
