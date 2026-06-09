import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex items-center gap-4 px-[clamp(18px,5vw,56px)] py-5">
        <Link href="/" aria-label="PollPotato home">
          <Wordmark />
        </Link>
        <div className="flex-1" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-[clamp(18px,5vw,56px)] pb-16 pt-4 sm:items-center">
        {children}
      </main>
    </div>
  );
}
