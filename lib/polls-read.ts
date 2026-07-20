import { and, asc, eq } from "drizzle-orm";
import { db, poll, pollOption, vote, type Poll, type PollOption } from "./db";
import { getIdentity, type Identity } from "./identity";
import { ownsPoll } from "./ownership";

export type OptionVoter = {
  name: string;
  isYou: boolean;
};

export type PollOptionForView = {
  id: string;
  label: string;
  position: number;
  voteCount: number | null; // null when results are hidden until voted
  voters: OptionVoter[] | null; // null unless the poll surfaces voter names
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
  showVoters: boolean;
  isClosed: boolean;
  isOwner: boolean;
  options: PollOptionForView[];
  viewerVote: string[];
  hasVoted: boolean;
  totalVotes: number | null;
  resultsHidden: boolean;
};

/**
 * Loads every vote's name for a poll, grouped by option and ordered by when it
 * was cast (earliest first, for stable chip order). Marks the viewer's own
 * vote so the UI can highlight it. Names are only requested when the poll's
 * show_voters setting is on and results aren't hidden — callers gate this.
 */
async function loadVotersByOption(
  pollId: string,
  identity: Identity,
): Promise<Map<string, OptionVoter[]>> {
  const rows = await db.query.vote.findMany({
    where: eq(vote.pollId, pollId),
    columns: {
      optionId: true,
      voterName: true,
      userId: true,
      voterToken: true,
    },
    orderBy: (v) => asc(v.createdAt),
  });

  const map = new Map<string, OptionVoter[]>();
  for (const r of rows) {
    const isYou =
      (identity.kind === "user" && !!r.userId && r.userId === identity.userId) ||
      (!!identity.voterToken &&
        !!r.voterToken &&
        r.voterToken === identity.voterToken);
    const list = map.get(r.optionId) ?? [];
    // require_name is enforced whenever show_voters is on, so a name should
    // always be present; fall back defensively rather than render an empty chip.
    list.push({ name: r.voterName?.trim() || "Anonymous", isYou });
    map.set(r.optionId, list);
  }
  return map;
}

export async function getPoll(slug: string): Promise<PollView | null> {
  const p = await db.query.poll.findFirst({ where: eq(poll.slug, slug) });
  if (!p) return null;

  const options = await db.query.pollOption.findMany({
    where: eq(pollOption.pollId, p.id),
    orderBy: (o) => asc(o.position),
  });

  const identity = await getIdentity();
  const isOwner = ownsPoll(p, {
    userId: identity.kind === "user" ? identity.userId : null,
    creatorToken: identity.creatorToken,
  });

  // The viewer's own votes — independent of ownership, keyed on whichever
  // identity they hold (account when signed in, voter cookie otherwise).
  let viewerVoteRows: { optionId: string }[] = [];
  if (identity.kind === "user") {
    viewerVoteRows = await db.query.vote.findMany({
      where: and(eq(vote.pollId, p.id), eq(vote.userId, identity.userId)),
      columns: { optionId: true },
    });
  } else if (identity.voterToken) {
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

  const showVoters = p.showVoters && !resultsHidden;
  const votersByOption = showVoters
    ? await loadVotersByOption(p.id, identity)
    : null;

  const viewOptions: PollOptionForView[] = options.map((o) => ({
    id: o.id,
    label: o.label,
    position: o.position,
    voteCount: resultsHidden ? null : o.voteCount,
    voters: votersByOption ? (votersByOption.get(o.id) ?? []) : null,
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
    showVoters: p.showVoters,
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
  showVoters: boolean;
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
  const isOwner = ownsPoll(p, {
    userId: identity.kind === "user" ? identity.userId : null,
    creatorToken: identity.creatorToken,
  });
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
    showVoters: p.showVoters,
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
    where: (p, { eq, or, and, isNull }) => {
      const clauses = [];
      if (userId) clauses.push(eq(p.creatorUserId, userId));
      // The creator cookie only owns polls no account has claimed — mirrors
      // `ownsPoll`, so a signed-out browser doesn't list account-owned polls.
      if (creatorToken)
        clauses.push(
          and(eq(p.creatorToken, creatorToken), isNull(p.creatorUserId)),
        );
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
  options: {
    id: string;
    voteCount: number | null;
    voters: OptionVoter[] | null;
  }[];
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

  const showVoters = p.showVoters && !resultsHidden;
  const votersByOption = showVoters
    ? await loadVotersByOption(p.id, identity)
    : null;

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
      voters: votersByOption ? (votersByOption.get(o.id) ?? []) : null,
    })),
  };
}
