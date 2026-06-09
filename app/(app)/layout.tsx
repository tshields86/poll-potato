import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { UserMenu } from "@/components/auth/user-menu";

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
        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            href="/app/my-polls"
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            My polls
          </Link>
        </nav>
        <div className="flex-1" />
        <ThemeToggle />
        <UserMenu />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
