import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, poll, pollOption } from "@/lib/db";
import { ShareUrl } from "@/components/poll/share-url";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type SearchParams = { "just-created"?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const found = await db.query.poll.findFirst({ where: eq(poll.slug, slug) });
  if (!found) return { title: "Poll not found · PollPotato" };
  return {
    title: `${found.question} · PollPotato`,
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

  const found = await db.query.poll.findFirst({
    where: eq(poll.slug, slug),
  });
  if (!found) notFound();

  const options = await db.query.pollOption.findMany({
    where: eq(pollOption.pollId, found.id),
    orderBy: (o, { asc }) => asc(o.position),
  });

  const closesIn = found.closesAt
    ? formatDistanceToFuture(found.closesAt)
    : null;

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
          className={`h-2 w-2 rounded-full ${found.status === "open" ? "bg-green-500" : "bg-ink-soft"}`}
        />
        {found.status === "open"
          ? closesIn
            ? `Open · closes ${closesIn}`
            : "Open"
          : "Closed"}
      </div>

      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {found.question}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Voting lands in M4. Right now this is just the share-link preview.
      </p>

      <ul className="mt-6 space-y-3">
        {options.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between rounded-[16px] border-2 border-line bg-surface px-4 py-3 text-base font-semibold"
          >
            <span>{o.label}</span>
            <span aria-hidden className="h-[22px] w-[22px] rounded-full border-2 border-line" />
          </li>
        ))}
      </ul>

      <dl className="mt-8 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-ink-soft">Multiple answers</dt>
        <dd className="text-right font-semibold">{found.allowMultiple ? "Yes" : "No"}</dd>
        <dt className="text-ink-soft">Require name</dt>
        <dd className="text-right font-semibold">{found.requireName ? "Yes" : "No"}</dd>
        <dt className="text-ink-soft">Hide results until voted</dt>
        <dd className="text-right font-semibold">{found.hideResults ? "Yes" : "No"}</dd>
        <dt className="text-ink-soft">Auto-close</dt>
        <dd className="text-right font-semibold">
          {found.closesAt ? found.closesAt.toLocaleString() : "Off"}
        </dd>
      </dl>

      {!justCreated && (
        <div className="mt-8">
          <ShareUrl slug={slug} />
        </div>
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
