import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { UserMenu } from "@/components/auth/user-menu";

// Marketing is statically renderable / ISR-cached, so we deliberately don't
// look up the visitor's session here — the header always shows the
// unauthenticated Sign in / Sign up CTAs. Inside the app (app)/layout.tsx
// runs getSession() and swaps in the real menu.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-[clamp(14px,4vw,56px)] py-4 sm:gap-4 sm:py-5">
        <Link href="/" aria-label="PollPotato home">
          <Wordmark />
        </Link>
        <div className="flex-1" />
        <ThemeToggle />
        <UserMenu user={null} crossHost />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
