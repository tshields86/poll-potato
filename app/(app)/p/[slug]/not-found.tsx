import Link from "next/link";
import { Mascot } from "@/components/mascot";

export default function PollNotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-6 px-[clamp(18px,5vw,56px)] py-16 text-center">
      <Mascot mood="expectant" />
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Couldn&apos;t find that poll.
        </h1>
        <p className="mt-3 text-ink-soft">
          The link might be wrong, or the owner deleted it. If someone shared
          this with you, ask them to send the link again.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/app/create"
          className="inline-flex items-center rounded-[14px] bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
        >
          Start your own
        </Link>
        <Link
          href="/"
          className="font-display text-sm font-bold text-ink-soft hover:text-ink"
        >
          Back to home →
        </Link>
      </div>
    </section>
  );
}
