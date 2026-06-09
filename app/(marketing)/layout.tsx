import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex flex-wrap items-center gap-4 border-b border-line bg-surface px-[clamp(18px,5vw,56px)] py-5">
        <Link href="/" aria-label="PollPotato home">
          <Wordmark />
        </Link>
        <div className="flex-1" />
        <ThemeToggle />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
