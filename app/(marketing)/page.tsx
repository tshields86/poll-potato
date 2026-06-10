import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, poll, pollOption } from "@/lib/db";
import { Mascot } from "@/components/mascot";

export const revalidate = 60;

const FEATURED_SLUG = process.env.FEATURED_POLL_SLUG ?? "best-pizza-topping";
const APP_URL = process.env.PP_APP_URL ?? "https://app.pollpotato.com";

type FeaturedResult = {
  question: string;
  options: { id: string; label: string; voteCount: number }[];
  total: number;
};

const FALLBACK: FeaturedResult = {
  question: "Tabs or spaces?",
  options: [
    { id: "fallback-spaces", label: "Spaces", voteCount: 61 },
    { id: "fallback-tabs", label: "Tabs", voteCount: 39 },
  ],
  total: 100,
};

async function getFeatured(): Promise<FeaturedResult> {
  try {
    const found = await db.query.poll.findFirst({
      where: eq(poll.slug, FEATURED_SLUG),
    });
    if (!found || found.hideResults) return FALLBACK;
    const opts = await db.query.pollOption.findMany({
      where: eq(pollOption.pollId, found.id),
      orderBy: (o) => asc(o.position),
      columns: { id: true, label: true, voteCount: true },
    });
    const total = opts.reduce((a, o) => a + o.voteCount, 0);
    if (total === 0) return FALLBACK;
    return { question: found.question, options: opts, total };
  } catch {
    return FALLBACK;
  }
}

export default async function MarketingHome() {
  const featured = await getFeatured();
  const sorted = [...featured.options].sort((a, b) => b.voteCount - a.voteCount);
  const top = sorted.slice(0, 2);

  return (
    <section className="mx-auto max-w-6xl px-[clamp(18px,5vw,56px)] py-12 lg:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Mascot mood="happy" animation="bob" className="mb-6" />
          <h1 className="font-display text-[clamp(40px,6vw,64px)] font-extrabold leading-[1.02] tracking-tight">
            Settle it.{" "}
            <em className="rounded-xl bg-mark px-3 not-italic text-mark-ink">
              Fast.
            </em>
          </h1>
          <p className="mt-5 max-w-[28rem] text-[18px] text-ink-soft">
            Spin up a poll in ten seconds, share one link, and watch the votes
            roll in. No sign-up, no fuss — just an answer.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Link
              href={`${APP_URL}/app/create`}
              className="inline-flex items-center rounded-[14px] bg-primary px-7 py-4 font-display text-base font-bold text-primary-foreground transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
            >
              Start a poll
            </Link>
            <Link
              href={`${APP_URL}/p/${FEATURED_SLUG}`}
              className="font-display text-[15px] font-bold text-ink-soft hover:text-ink"
            >
              or see an example →
            </Link>
          </div>
        </div>

        <FeaturedDemo question={featured.question} options={top} total={featured.total} />
      </div>
    </section>
  );
}

function FeaturedDemo({
  question,
  options,
  total,
}: {
  question: string;
  options: { id: string; label: string; voteCount: number }[];
  total: number;
}) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_50px_-28px_rgb(33_27_78_/_0.12)]">
      <p className="font-display text-lg font-extrabold tracking-tight">
        {question}
      </p>
      <ol className="mt-4 space-y-3">
        {options.map((o, i) => {
          const pct = total === 0 ? 0 : Math.round((o.voteCount / total) * 100);
          const win = i === 0;
          return (
            <li key={o.id}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[15px] font-semibold">{o.label}</span>
                <span
                  className={`font-mono text-[15px] font-bold ${win ? "text-primary" : ""}`}
                >
                  {pct}%
                </span>
              </div>
              <div className="h-7 overflow-hidden rounded-[10px] bg-bar-track">
                <div
                  className="h-full rounded-[10px] bg-bar transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 flex items-center gap-1.5 font-mono text-xs font-bold text-green-700 dark:text-green-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_0_3px_rgb(34_197_94_/_0.16)]" />
        updating live · {total.toLocaleString()} votes
      </p>
    </div>
  );
}
