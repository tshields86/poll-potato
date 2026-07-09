import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { UserMenu } from "@/components/auth/user-menu";
import { auth } from "@/lib/auth/server";

// The whole app surface (app.pollpotato.com) is noindex — marketing/SEO lives
// on the bare-domain (marketing) group. robots.txt disallows these paths too;
// this is belt-and-suspenders for backlinks that might surface a URL anyway.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
          {/* Icon-only on mobile so the "My polls" nav link fits the header. */}
          <Wordmark textClassName="hidden sm:inline" />
        </Link>
        {user && (
          <nav className="flex items-center gap-1">
            <Link
              href="/app/my-polls"
              className="rounded-full px-2.5 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink sm:px-3"
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
