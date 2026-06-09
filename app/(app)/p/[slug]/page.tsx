import { notFound } from "next/navigation";
import { getPoll } from "@/lib/polls-read";
import { ShareUrl } from "@/components/poll/share-url";
import { VoteView } from "@/components/poll/vote-view";
import { ResultsView } from "@/components/poll/results-view";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type SearchParams = { "just-created"?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const poll = await getPoll(slug);
  if (!poll) return { title: "Poll not found · PollPotato" };
  return {
    title: `${poll.question} · PollPotato`,
    description: "Cast your vote on PollPotato.",
  };
}

export default async function PollPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const { "just-created": justCreated } = await searchParams;
  const poll = await getPoll(slug);
  if (!poll) notFound();

  const showResults = poll.isClosed || (poll.hasVoted && !poll.resultsHidden);
  const closesIn = poll.closesAt ? formatDistanceToFuture(poll.closesAt) : null;

  return (
    <section className="mx-auto max-w-xl px-[clamp(18px,5vw,56px)] py-10">
      {justCreated && (
        <div className="mb-6 rounded-2xl border border-line bg-surface p-4">
          <p className="font-display text-base font-extrabold">
            Poll created — share this link.
          </p>
          <ShareUrl slug={slug} className="mt-3" />
        </div>
      )}

      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <span
          className={`h-2 w-2 rounded-full ${
            poll.isClosed ? "bg-ink-soft" : "bg-green-500"
          }`}
        />
        {poll.isClosed
          ? "Closed · final results"
          : closesIn
            ? `Open · closes ${closesIn}`
            : "Open"}
      </div>

      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {poll.question}
      </h1>

      <div className="mt-6">
        {showResults ? <ResultsView poll={poll} /> : <VoteView poll={poll} />}
      </div>
    </section>
  );
}

function formatDistanceToFuture(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return "soon";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} hr`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
}
