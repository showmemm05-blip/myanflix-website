/**
 * The reader takes the whole viewport — no rail, no tab bar, no top bar.
 *
 * Every other route runs inside AppShell, and the reader deliberately does
 * not: app chrome around a page of prose is what made this feel like a
 * website displaying a book instead of a book. The way back out is the
 * reader's own close button, which is always one tap away.
 */
export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
