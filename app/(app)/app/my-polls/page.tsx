import Link from "next/link";
import { listMyPolls } from "@/lib/polls-read";
import { PollRow } from "@/components/dashboard/poll-row";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My polls",
};

export default async function MyPollsPage() {
  const rows = await listMyPolls();

  return (
    <section className="mx-auto max-w-2xl px-[clamp(18px,5vw,56px)] py-10">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            My polls
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Polls you&apos;ve started. Open, close, or delete.
          </p>
        </div>
        <Link
          href="/app/create"
          className="rounded-[14px] bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
        >
          New poll
        </Link>
      </header>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <PollRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="font-display text-xl font-extrabold tracking-tight">
        No polls yet.
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        Start one — share a link, watch the votes roll in.
      </p>
      <Link
        href="/app/create"
        className="mt-5 inline-flex items-center rounded-[14px] bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
      >
        Start your first poll
      </Link>
    </div>
  );
}
