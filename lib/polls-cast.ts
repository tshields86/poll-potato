import { and, eq, inArray, sql } from "drizzle-orm";
import { db, poll, pollOption, vote } from "./db";

const MAX_VOTER_NAME = 50;

export type CastVoteCoreInput = {
  pollId: string;
  optionIds: string[];
  voterName?: string;
  userId: string | null;
  voterToken: string;
};

export type CastVoteCoreError = {
  error: string;
  field?: "optionIds" | "voterName" | "poll";
};

export type CastVoteCoreResult =
  | {
      success: true;
      counts: { optionId: string; voteCount: number }[];
      viewerVote: string[];
      total: number;
    }
  | CastVoteCoreError;

/**
 * The integrity-rule core of castVote: validation, single/multi dedup,
 * require_name, closed/expired rejection. Pure of request context — call from
 * the server action (which adds rate limiting + identity resolution) or from
 * tests. The DB unique index on `vote` still backstops "same option twice."
 */
export async function castVoteFor(
  input: CastVoteCoreInput,
): Promise<CastVoteCoreResult> {
  const target = await db.query.poll.findFirst({
    where: eq(poll.id, input.pollId),
  });
  if (!target) return { error: "Poll not found.", field: "poll" };

  const isClosed =
    target.status === "closed" ||
    (!!target.closesAt && target.closesAt.getTime() <= Date.now());
  if (isClosed) return { error: "This poll is closed.", field: "poll" };

  const optionIds = Array.from(new Set(input.optionIds ?? []));
  if (optionIds.length === 0) {
    return { error: "Pick an option.", field: "optionIds" };
  }
  if (!target.allowMultiple && optionIds.length > 1) {
    return { error: "This poll allows only one answer.", field: "optionIds" };
  }
  const owned = await db.query.pollOption.findMany({
    where: and(
      eq(pollOption.pollId, target.id),
      inArray(pollOption.id, optionIds),
    ),
  });
  if (owned.length !== optionIds.length) {
    return { error: "Option doesn't belong to this poll.", field: "optionIds" };
  }

  let voterName: string | null = null;
  // require_name applies to everyone, signed-in included. Signed-in voters get
  // their account name prefilled client-side, so this normally passes without
  // friction — but a blank submission is still rejected rather than silently
  // stored as null (which would surface as "Anonymous" when show_voters is on).
  if (target.requireName) {
    const name = (input.voterName ?? "").trim();
    if (!name) {
      return { error: "This poll requires a name.", field: "voterName" };
    }
    if (name.length > MAX_VOTER_NAME) {
      return {
        error: `Name is too long — keep it under ${MAX_VOTER_NAME} characters.`,
        field: "voterName",
      };
    }
    voterName = name;
  } else if (input.voterName) {
    voterName = input.voterName.trim().slice(0, MAX_VOTER_NAME) || null;
  }

  // The voter's current selection for this poll should be exactly `optionIds`
  // — delete-then-insert applies for both single-choice and multi-choice. The
  // earlier implementation only deleted prior votes when allowMultiple was
  // false, so changing a multi-select from {A,B} to {A,C} left B behind.
  const priorWhere = input.userId
    ? and(eq(vote.pollId, target.id), eq(vote.userId, input.userId))
    : and(eq(vote.pollId, target.id), eq(vote.voterToken, input.voterToken));
  const removed = await db
    .delete(vote)
    .where(priorWhere)
    .returning({ optionId: vote.optionId });
  for (const r of removed) {
    await db
      .update(pollOption)
      .set({ voteCount: sql`${pollOption.voteCount} - 1` })
      .where(eq(pollOption.id, r.optionId));
  }

  const inserted = await db
    .insert(vote)
    .values(
      optionIds.map((optionId) => ({
        pollId: target.id,
        optionId,
        userId: input.userId,
        voterToken: input.userId ? null : input.voterToken,
        voterName,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: vote.id, optionId: vote.optionId });

  for (const r of inserted) {
    await db
      .update(pollOption)
      .set({ voteCount: sql`${pollOption.voteCount} + 1` })
      .where(eq(pollOption.id, r.optionId));
  }

  const fresh = await db.query.pollOption.findMany({
    where: eq(pollOption.pollId, target.id),
  });
  const counts = fresh.map((o) => ({ optionId: o.id, voteCount: o.voteCount }));
  const total = counts.reduce((a, c) => a + c.voteCount, 0);

  const viewerVoteRows = input.userId
    ? await db.query.vote.findMany({
        where: and(eq(vote.pollId, target.id), eq(vote.userId, input.userId)),
        columns: { optionId: true },
      })
    : await db.query.vote.findMany({
        where: and(
          eq(vote.pollId, target.id),
          eq(vote.voterToken, input.voterToken),
        ),
        columns: { optionId: true },
      });

  return {
    success: true,
    counts,
    viewerVote: viewerVoteRows.map((r) => r.optionId),
    total,
  };
}
