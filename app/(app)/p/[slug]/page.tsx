import { notFound } from "next/navigation";
import { getPoll } from "@/lib/polls-read";
import { auth } from "@/lib/auth/server";
import { ShareUrl } from "@/components/poll/share-url";
import { VoteView } from "@/components/poll/vote-view";
import { ResultsView } from "@/components/poll/results-view";
import { OwnerControls } from "@/components/poll/owner-controls";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type SearchParams = { "just-created"?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const poll = await getPoll(slug);
  if (!poll) {
    return { title: "Poll not found", robots: { index: false } };
  }
  // `title` gets the root template applied ("%s · PollPotato"), so use the
  // bare question here. OG/Twitter titles are not templated and need the
  // brand suffix added explicitly.
  const socialTitle = `${poll.question} · PollPotato`;
  const description = poll.isClosed
    ? "See how the group voted."
    : "Cast your vote — share the link, settle it fast.";
  const url = `/p/${slug}`;
  // Defining openGraph here shadows the root app/opengraph-image.png file
  // convention, so the branded card has to be attached explicitly or shared
  // poll links unfurl with no image. Resolved against metadataBase
  // (pollpotato.com), where the 1200×630 PNG is served. Same card for every
  // poll — per-poll images would need runtime image generation, which next/og
  // can't do on Workers.
  const ogImage = {
    url: "/opengraph-image.png",
    width: 1200,
    height: 630,
    alt: "PollPotato",
  };
  return {
    title: poll.question,
    description,
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: "PollPotato",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [ogImage],
    },
    alternates: { canonical: url },
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

  // Prefill the name field for signed-in voters so "require a name" polls don't
  // make them retype what their account already knows.
  const { data: session } = await auth.getSession();
  const viewerName = session?.user?.name ?? "";

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
        {showResults ? (
          <ResultsView poll={poll} viewerName={viewerName} />
        ) : (
          <VoteView poll={poll} initialName={viewerName} />
        )}
      </div>

      {poll.isOwner && (
        <OwnerControls
          pollId={poll.id}
          slug={poll.slug}
          question={poll.question}
          isClosed={poll.isClosed}
        />
      )}
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
