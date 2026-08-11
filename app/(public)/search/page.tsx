import { redirect } from "next/navigation";

export default async function SearchRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `/movies?tab=movies&q=${encodeURIComponent(q)}` : "/movies?tab=movies");
}
