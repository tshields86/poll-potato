import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex flex-wrap items-center gap-4 border-b border-line bg-surface px-[clamp(18px,5vw,56px)] py-5">
        <Link href="/app" aria-label="PollPotato app">
          <Wordmark />
        </Link>
        <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft">
          app
        </span>
        <div className="flex-1" />
        <ThemeToggle />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
