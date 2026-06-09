import { eq } from "drizzle-orm";
import { db, poll, pollOption, vote } from "../lib/db";
import { castVoteFor } from "../lib/polls-cast";
import { newSlug } from "../lib/slug";

type PollSetup = {
  id: string;
  options: { id: string; label: string }[];
};

async function planPoll(
  opts: {
    question?: string;
    options?: string[];
    allowMultiple?: boolean;
    requireName?: boolean;
    status?: "open" | "closed";
    closesAt?: Date | null;
  } = {},
): Promise<PollSetup> {
  const labels = opts.options ?? ["A", "B", "C"];
  const [p] = await db
    .insert(poll)
    .values({
      slug: newSlug(),
      question: opts.question ?? "Probe?",
      creatorToken: `verify-m4-${Date.now()}-${Math.random()}`,
      allowMultiple: opts.allowMultiple ?? false,
      requireName: opts.requireName ?? false,
      status: opts.status ?? "open",
      closesAt: opts.closesAt ?? null,
    })
    .returning();
  const options = await db
    .insert(pollOption)
    .values(
      labels.map((label, position) => ({
        pollId: p.id,
        label,
        position,
      })),
    )
    .returning();
  return { id: p.id, options: options.map((o) => ({ id: o.id, label: o.label })) };
}

async function dropPoll(id: string) {
  await db.delete(poll).where(eq(poll.id, id));
}

function assert(cond: unknown, label: string) {
  if (!cond) throw new Error(`✗ ${label}`);
  console.log(`✓ ${label}`);
}

async function main() {
  console.log("M4 verification…\n");

  // ──────────────────────────────────────────
  // 1. Single-choice happy path + idempotent re-cast for same option
  {
    const p = await planPoll({ options: ["Lake", "Beach", "Mountain"] });
    const token = `voter-${newSlug()}`;
    const first = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: token,
    });
    assert("success" in first && first.success, "single-choice cast accepted");

    const again = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: token,
    });
    assert(
      "success" in again && again.success && again.total === 1,
      "re-casting same option keeps total at 1",
    );

    const switched = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[1].id],
      userId: null,
      voterToken: token,
    });
    assert(
      "success" in switched && switched.success && switched.total === 1,
      "switching to a different option still keeps total at 1 (replaced)",
    );
    assert(
      "viewerVote" in switched &&
        switched.viewerVote.length === 1 &&
        switched.viewerVote[0] === p.options[1].id,
      "viewerVote reflects the switched-to option only",
    );
    await dropPoll(p.id);
  }

  // ──────────────────────────────────────────
  // 2. Single-choice with >1 option is rejected
  {
    const p = await planPoll();
    const r = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id, p.options[1].id],
      userId: null,
      voterToken: `t-${newSlug()}`,
    });
    assert(
      "error" in r && r.field === "optionIds",
      "single-choice rejects multiple optionIds",
    );
    await dropPoll(p.id);
  }

  // ──────────────────────────────────────────
  // 3. Multi-choice happy path + same option twice is idempotent
  {
    const p = await planPoll({ allowMultiple: true });
    const token = `voter-${newSlug()}`;
    const r1 = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id, p.options[1].id],
      userId: null,
      voterToken: token,
    });
    assert(
      "success" in r1 && r1.success && r1.total === 2,
      "multi-choice accepts two options at once",
    );
    const r2 = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: token,
    });
    assert(
      "success" in r2 && r2.success && r2.total === 2,
      "re-casting same option in multi is a no-op (DB unique catches it)",
    );
    await dropPoll(p.id);
  }

  // ──────────────────────────────────────────
  // 4. require_name: empty name rejected; provided name accepted
  {
    const p = await planPoll({ requireName: true });
    const r1 = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: `t-${newSlug()}`,
    });
    assert(
      "error" in r1 && r1.field === "voterName",
      "require_name + no name → rejected",
    );
    const r2 = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      voterName: "Alex",
      userId: null,
      voterToken: `t-${newSlug()}`,
    });
    assert(
      "success" in r2 && r2.success,
      "require_name + name → accepted",
    );
    await dropPoll(p.id);
  }

  // ──────────────────────────────────────────
  // 5. Status=closed → rejected
  {
    const p = await planPoll({ status: "closed" });
    const r = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: `t-${newSlug()}`,
    });
    assert("error" in r && r.field === "poll", "closed poll → rejected");
    await dropPoll(p.id);
  }

  // ──────────────────────────────────────────
  // 6. closes_at in the past → rejected (expired)
  {
    const p = await planPoll({ closesAt: new Date(Date.now() - 60_000) });
    const r = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: `t-${newSlug()}`,
    });
    assert("error" in r && r.field === "poll", "expired poll → rejected");
    await dropPoll(p.id);
  }

  // ──────────────────────────────────────────
  // 7. Cross-poll option id is rejected
  {
    const a = await planPoll();
    const b = await planPoll();
    const r = await castVoteFor({
      pollId: a.id,
      optionIds: [b.options[0].id],
      userId: null,
      voterToken: `t-${newSlug()}`,
    });
    assert(
      "error" in r && r.field === "optionIds",
      "option from a different poll → rejected",
    );
    await dropPoll(a.id);
    await dropPoll(b.id);
  }

  // ──────────────────────────────────────────
  // 8. Empty optionIds is rejected
  {
    const p = await planPoll();
    const r = await castVoteFor({
      pollId: p.id,
      optionIds: [],
      userId: null,
      voterToken: `t-${newSlug()}`,
    });
    assert(
      "error" in r && r.field === "optionIds",
      "empty optionIds → rejected",
    );
    await dropPoll(p.id);
  }

  // ──────────────────────────────────────────
  // 9. vote_count cache stays consistent with vote rows
  {
    const p = await planPoll({ allowMultiple: true });
    await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id, p.options[1].id],
      userId: null,
      voterToken: `t-${newSlug()}`,
    });
    await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: `t-${newSlug()}`,
    });
    const fresh = await db.query.pollOption.findMany({
      where: eq(pollOption.pollId, p.id),
    });
    const rows = await db.query.vote.findMany({ where: eq(vote.pollId, p.id) });
    const byOption = new Map<string, number>();
    for (const r of rows) {
      byOption.set(r.optionId, (byOption.get(r.optionId) ?? 0) + 1);
    }
    for (const o of fresh) {
      const expected = byOption.get(o.id) ?? 0;
      if (o.voteCount !== expected) {
        throw new Error(
          `vote_count drift on ${o.label}: cache=${o.voteCount} rows=${expected}`,
        );
      }
    }
    console.log("✓ vote_count cache matches vote-row counts");
    await dropPoll(p.id);
  }

  console.log("\nM4 acceptance check: PASS");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nM4 acceptance check: FAIL");
    console.error(err);
    process.exit(1);
  });
