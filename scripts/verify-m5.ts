import { eq } from "drizzle-orm";
import { db, poll, pollOption } from "../lib/db";
import { castVoteFor } from "../lib/polls-cast";
import { newSlug } from "../lib/slug";

type Snapshot = {
  slug: string;
  status: "open" | "closed";
  isClosed: boolean;
  resultsHidden: boolean;
  total: number | null;
  options: { id: string; voteCount: number | null }[];
};

const baseUrl = process.env.PP_BASE_URL ?? "http://localhost:3344";

function assert(cond: unknown, label: string) {
  if (!cond) throw new Error(`✗ ${label}`);
  console.log(`✓ ${label}`);
}

async function fetchResults(slug: string, cookies?: string): Promise<Snapshot> {
  const res = await fetch(`${baseUrl}/api/polls/${slug}/results`, {
    headers: cookies ? { cookie: cookies } : undefined,
  });
  if (!res.ok) throw new Error(`results endpoint returned ${res.status}`);
  return res.json();
}

async function planPoll(opts: { hideResults?: boolean } = {}) {
  const slug = newSlug();
  const [p] = await db
    .insert(poll)
    .values({
      slug,
      question: "M5 probe?",
      creatorToken: `verify-m5-${Date.now()}-${Math.random()}`,
      hideResults: !!opts.hideResults,
    })
    .returning();
  const options = await db
    .insert(pollOption)
    .values([
      { pollId: p.id, label: "Yes", position: 0 },
      { pollId: p.id, label: "No", position: 1 },
    ])
    .returning();
  return { id: p.id, slug, options };
}

async function dropPoll(id: string) {
  await db.delete(poll).where(eq(poll.id, id));
}

async function main() {
  console.log("M5 verification…\n");

  // ─────────────────────────────────────────────
  // 1. /api/polls/[slug]/results returns expected shape
  {
    const p = await planPoll();
    const snap = await fetchResults(p.slug);
    assert(snap.slug === p.slug, "results endpoint returns matching slug");
    assert(snap.options.length === 2, "results endpoint returns all options");
    assert(snap.total === 0, "total starts at 0");
    assert(!snap.resultsHidden, "no hide_results → resultsHidden=false");
    await dropPoll(p.id);
  }

  // ─────────────────────────────────────────────
  // 2. Two-cookie-jar simulation: voter A casts, voter B sees update
  {
    const p = await planPoll();

    const before = await fetchResults(p.slug, "pp_voter_token=viewer-b");
    assert(before.total === 0, "voter B sees total=0 before voter A votes");

    await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: "voter-a-token",
    });

    const after = await fetchResults(p.slug, "pp_voter_token=viewer-b");
    assert(after.total === 1, "voter B's snapshot now shows 1 vote");
    const yesCount = after.options.find((o) => o.id === p.options[0].id)?.voteCount;
    assert(yesCount === 1, "the voted-for option has voteCount=1 for voter B");

    await dropPoll(p.id);
  }

  // ─────────────────────────────────────────────
  // 3. hide_results: counts are null for non-voters, present for voters
  {
    const p = await planPoll({ hideResults: true });

    // Plant a few votes so there's actual data to hide
    await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: "external-a",
    });
    await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[1].id],
      userId: null,
      voterToken: "external-b",
    });

    // Non-voter: counts hidden
    const stranger = await fetchResults(p.slug, "pp_voter_token=stranger");
    assert(
      stranger.resultsHidden === true,
      "hide_results poll: stranger sees resultsHidden=true",
    );
    assert(stranger.total === null, "stranger.total is null");
    assert(
      stranger.options.every((o) => o.voteCount === null),
      "stranger sees null voteCounts",
    );

    // Voter who has cast a vote: counts revealed
    await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: "after-voting",
    });
    const voter = await fetchResults(p.slug, "pp_voter_token=after-voting");
    assert(
      voter.resultsHidden === false,
      "hide_results poll: a voter sees resultsHidden=false",
    );
    assert(voter.total === 3, "voter sees total=3");

    await dropPoll(p.id);
  }

  // ─────────────────────────────────────────────
  // 4. Missing slug → 404
  {
    const res = await fetch(`${baseUrl}/api/polls/does-not-exist/results`);
    assert(res.status === 404, "missing slug → 404");
  }

  console.log("\nM5 acceptance check: PASS");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nM5 acceptance check: FAIL");
    console.error(err);
    process.exit(1);
  });
