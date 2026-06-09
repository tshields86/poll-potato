import { and, asc, eq } from "drizzle-orm";
import { db, poll, pollOption, vote, type Poll, type PollOption } from "./db";
import { getIdentity } from "./identity";

export type PollOptionForView = {
  id: string;
  label: string;
  position: number;
  voteCount: number | null; // null when results are hidden until voted
};

export type PollView = {
  id: string;
  slug: string;
  question: string;
  status: "open" | "closed";
  closesAt: Date | null;
  allowMultiple: boolean;
  requireName: boolean;
  hideResults: boolean;
  isClosed: boolean;
  isOwner: boolean;
  options: PollOptionForView[];
  viewerVote: string[];
  hasVoted: boolean;
  totalVotes: number | null;
  resultsHidden: boolean;
};

export async function getPoll(slug: string): Promise<PollView | null> {
  const p = await db.query.poll.findFirst({ where: eq(poll.slug, slug) });
  if (!p) return null;

  const options = await db.query.pollOption.findMany({
    where: eq(pollOption.pollId, p.id),
    orderBy: (o) => asc(o.position),
  });

  const identity = await getIdentity();
  let isOwner = false;
  let viewerVoteRows: { optionId: string }[] = [];

  if (identity.kind === "user") {
    isOwner = p.creatorUserId === identity.userId;
    viewerVoteRows = await db.query.vote.findMany({
      where: and(eq(vote.pollId, p.id), eq(vote.userId, identity.userId)),
      columns: { optionId: true },
    });
  } else if (identity.voterToken) {
    isOwner =
      !!identity.creatorToken && p.creatorToken === identity.creatorToken;
    viewerVoteRows = await db.query.vote.findMany({
      where: and(
        eq(vote.pollId, p.id),
        eq(vote.voterToken, identity.voterToken),
      ),
      columns: { optionId: true },
    });
  }

  const viewerVote = viewerVoteRows.map((v) => v.optionId);
  const hasVoted = viewerVote.length > 0;

  const isClosed =
    p.status === "closed" ||
    (!!p.closesAt && p.closesAt.getTime() <= Date.now());

  // Hide results unless the viewer has voted or the poll has closed (closed
  // polls reveal final results to everyone — the spec calls hide_results out
  // as "until voted", and a closed poll is the natural reveal point).
  const resultsHidden = p.hideResults && !hasVoted && !isClosed;

  const viewOptions: PollOptionForView[] = options.map((o) => ({
    id: o.id,
    label: o.label,
    position: o.position,
    voteCount: resultsHidden ? null : o.voteCount,
  }));

  const totalVotes = resultsHidden
    ? null
    : viewOptions.reduce((acc, o) => acc + (o.voteCount ?? 0), 0);

  return {
    id: p.id,
    slug: p.slug,
    question: p.question,
    status: p.status as "open" | "closed",
    closesAt: p.closesAt,
    allowMultiple: p.allowMultiple,
    requireName: p.requireName,
    hideResults: p.hideResults,
    isClosed,
    isOwner,
    options: viewOptions,
    viewerVote,
    hasVoted,
    totalVotes,
    resultsHidden,
  };
}

// Re-export raw types for places that read poll without view normalization.
export type { Poll, PollOption };
