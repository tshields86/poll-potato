import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { UserMenu } from "@/components/auth/user-menu";
import { auth } from "@/lib/auth/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = await auth.getSession();
  const user = data?.user ?? null;

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-[clamp(14px,4vw,56px)] py-4 sm:gap-4 sm:py-5">
        <Link href="/app" aria-label="PollPotato app">
          <Wordmark />
        </Link>
        {user && (
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/app/my-polls"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
            >
              My polls
            </Link>
          </nav>
        )}
        <div className="flex-1" />
        <ThemeToggle />
        <UserMenu user={user} />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
