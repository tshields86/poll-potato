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

export type EditablePoll = {
  id: string;
  slug: string;
  question: string;
  options: string[];
  allowMultiple: boolean;
  requireName: boolean;
  hideResults: boolean;
  closesAt: Date | null;
  hasVotes: boolean;
  isClosed: boolean;
};

/**
 * Poll data for the owner's edit screen. Returns null when the poll doesn't
 * exist OR the viewer isn't its owner (edit is owner-only). `hasVotes` mirrors
 * the backend rule that options lock once the first vote lands.
 */
export async function getPollForEdit(slug: string): Promise<EditablePoll | null> {
  const p = await db.query.poll.findFirst({ where: eq(poll.slug, slug) });
  if (!p) return null;

  const identity = await getIdentity();
  const isOwner =
    (identity.kind === "user" && p.creatorUserId === identity.userId) ||
    (!!identity.creatorToken && p.creatorToken === identity.creatorToken);
  if (!isOwner) return null;

  const options = await db.query.pollOption.findMany({
    where: eq(pollOption.pollId, p.id),
    orderBy: (o) => asc(o.position),
    columns: { label: true },
  });
  const anyVote = await db.query.vote.findFirst({
    where: eq(vote.pollId, p.id),
    columns: { id: true },
  });

  const isClosed =
    p.status === "closed" ||
    (!!p.closesAt && p.closesAt.getTime() <= Date.now());

  return {
    id: p.id,
    slug: p.slug,
    question: p.question,
    options: options.map((o) => o.label),
    allowMultiple: p.allowMultiple,
    requireName: p.requireName,
    hideResults: p.hideResults,
    closesAt: p.closesAt,
    hasVotes: !!anyVote,
    isClosed,
  };
}

// Re-export raw types for places that read poll without view normalization.
export type { Poll, PollOption };

export type MyPollRow = {
  id: string;
  slug: string;
  question: string;
  status: "open" | "closed";
  isClosed: boolean;
  closesAt: Date | null;
  createdAt: Date;
  totalVotes: number;
  optionCount: number;
};

/**
 * Polls owned by the current viewer — by user_id when signed in, falling back
 * to the anonymous creator_token cookie. Both are checked so users who created
 * polls before signing up still see them.
 */
export async function listMyPolls(): Promise<MyPollRow[]> {
  const identity = await getIdentity();
  const userId = identity.kind === "user" ? identity.userId : null;
  const creatorToken = identity.creatorToken;

  if (!userId && !creatorToken) return [];

  const owned = await db.query.poll.findMany({
    where: (p, { eq, or }) => {
      const clauses = [];
      if (userId) clauses.push(eq(p.creatorUserId, userId));
      if (creatorToken) clauses.push(eq(p.creatorToken, creatorToken));
      return clauses.length === 1 ? clauses[0] : or(...clauses);
    },
    orderBy: (p, { desc }) => desc(p.createdAt),
  });
  if (owned.length === 0) return [];

  const ids = owned.map((p) => p.id);
  const allOptions = await db.query.pollOption.findMany({
    where: (o, { inArray }) => inArray(o.pollId, ids),
    columns: { pollId: true, voteCount: true },
  });

  const totals = new Map<string, { total: number; count: number }>();
  for (const o of allOptions) {
    const prev = totals.get(o.pollId) ?? { total: 0, count: 0 };
    totals.set(o.pollId, {
      total: prev.total + o.voteCount,
      count: prev.count + 1,
    });
  }

  const now = Date.now();
  return owned.map((p) => {
    const totalsRow = totals.get(p.id) ?? { total: 0, count: 0 };
    return {
      id: p.id,
      slug: p.slug,
      question: p.question,
      status: p.status as "open" | "closed",
      isClosed:
        p.status === "closed" ||
        (!!p.closesAt && p.closesAt.getTime() <= now),
      closesAt: p.closesAt,
      createdAt: p.createdAt,
      totalVotes: totalsRow.total,
      optionCount: totalsRow.count,
    };
  });
}

export type ResultsSnapshot = {
  slug: string;
  status: "open" | "closed";
  isClosed: boolean;
  resultsHidden: boolean;
  total: number | null;
  options: { id: string; voteCount: number | null }[];
};

/**
 * Cheap polling endpoint payload: just the counts + status. Honors
 * hide_results based on the caller's identity (read from cookies/session).
 */
export async function getResults(slug: string): Promise<ResultsSnapshot | null> {
  const p = await db.query.poll.findFirst({ where: eq(poll.slug, slug) });
  if (!p) return null;

  const identity = await getIdentity();
  let hasVoted = false;
  if (identity.kind === "user") {
    const found = await db.query.vote.findFirst({
      where: and(eq(vote.pollId, p.id), eq(vote.userId, identity.userId)),
      columns: { id: true },
    });
    hasVoted = !!found;
  } else if (identity.voterToken) {
    const found = await db.query.vote.findFirst({
      where: and(eq(vote.pollId, p.id), eq(vote.voterToken, identity.voterToken)),
      columns: { id: true },
    });
    hasVoted = !!found;
  }

  const isClosed =
    p.status === "closed" ||
    (!!p.closesAt && p.closesAt.getTime() <= Date.now());
  const resultsHidden = p.hideResults && !hasVoted && !isClosed;

  const options = await db.query.pollOption.findMany({
    where: eq(pollOption.pollId, p.id),
    orderBy: (o) => asc(o.position),
    columns: { id: true, voteCount: true },
  });

  return {
    slug,
    status: p.status as "open" | "closed",
    isClosed,
    resultsHidden,
    total: resultsHidden
      ? null
      : options.reduce((a, o) => a + o.voteCount, 0),
    options: options.map((o) => ({
      id: o.id,
      voteCount: resultsHidden ? null : o.voteCount,
    })),
  };
}
