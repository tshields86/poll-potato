import { eq } from "drizzle-orm";
import { db, poll, pollOption, vote, type Poll } from "./db";
import { ownsPoll } from "./ownership";

const MAX_QUESTION = 200;
const MAX_OPTION = 100;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;

export type OwnerIdentity = {
  userId: string | null;
  creatorToken: string | undefined;
};

export type OwnerError = {
  error: string;
  code: "not_found" | "not_owner" | "validation";
};

export type OwnerSuccess = { success: true };
export type OwnerResult = OwnerSuccess | OwnerError;

export type UpdatePollPatch = {
  question?: string;
  allowMultiple?: boolean;
  requireName?: boolean;
  hideResults?: boolean;
  showVoters?: boolean;
  closesAt?: string | null;
  options?: { label: string }[];
};

function isOwnerOf(
  p: Pick<Poll, "creatorUserId" | "creatorToken">,
  id: OwnerIdentity,
): boolean {
  return ownsPoll(p, id);
}

export async function closePollFor(
  pollId: string,
  identity: OwnerIdentity,
): Promise<OwnerResult> {
  const target = await db.query.poll.findFirst({ where: eq(poll.id, pollId) });
  if (!target) return { error: "Poll not found.", code: "not_found" };
  if (!isOwnerOf(target, identity)) {
    return { error: "Not your poll.", code: "not_owner" };
  }
  if (target.status !== "closed") {
    await db
      .update(poll)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(poll.id, pollId));
  }
  return { success: true };
}

export async function deletePollFor(
  pollId: string,
  identity: OwnerIdentity,
): Promise<OwnerResult> {
  const target = await db.query.poll.findFirst({ where: eq(poll.id, pollId) });
  if (!target) return { error: "Poll not found.", code: "not_found" };
  if (!isOwnerOf(target, identity)) {
    return { error: "Not your poll.", code: "not_owner" };
  }
  // ON DELETE CASCADE on poll_option and vote handles children.
  await db.delete(poll).where(eq(poll.id, pollId));
  return { success: true };
}

export async function updatePollFor(
  pollId: string,
  patch: UpdatePollPatch,
  identity: OwnerIdentity,
): Promise<OwnerResult> {
  const target = await db.query.poll.findFirst({ where: eq(poll.id, pollId) });
  if (!target) return { error: "Poll not found.", code: "not_found" };
  if (!isOwnerOf(target, identity)) {
    return { error: "Not your poll.", code: "not_owner" };
  }

  const updates: Record<string, unknown> = {};

  if (patch.question !== undefined) {
    const q = patch.question.trim();
    if (!q) return { error: "Question can't be empty.", code: "validation" };
    if (q.length > MAX_QUESTION) {
      return {
        error: `Question is too long — keep it under ${MAX_QUESTION} characters.`,
        code: "validation",
      };
    }
    updates.question = q;
  }
  if (patch.allowMultiple !== undefined) updates.allowMultiple = patch.allowMultiple;
  if (patch.requireName !== undefined) updates.requireName = patch.requireName;
  if (patch.hideResults !== undefined) updates.hideResults = patch.hideResults;

  if (patch.showVoters !== undefined) {
    // Turning name-visibility ON after people have voted would retroactively
    // expose names they gave under a different expectation — never allow it.
    if (patch.showVoters && !target.showVoters) {
      const anyVote = await db.query.vote.findFirst({
        where: eq(vote.pollId, target.id),
        columns: { id: true },
      });
      if (anyVote) {
        return {
          error:
            "You can't reveal names once voting has started — set this when you create the poll.",
          code: "validation",
        };
      }
    }
    updates.showVoters = patch.showVoters;
    // Showing who voted requires a name from every voter.
    if (patch.showVoters) updates.requireName = true;
  }

  if (patch.closesAt !== undefined) {
    if (patch.closesAt === null) {
      updates.closesAt = null;
    } else {
      const d = new Date(patch.closesAt);
      if (Number.isNaN(d.getTime())) {
        return { error: "Couldn't read that close date.", code: "validation" };
      }
      updates.closesAt = d;
    }
  }

  if (patch.options) {
    const anyVote = await db.query.vote.findFirst({
      where: eq(vote.pollId, target.id),
      columns: { id: true },
    });
    if (anyVote) {
      return {
        error: "Options are locked once voting starts. Close the poll and start a new one.",
        code: "validation",
      };
    }
    const labels = patch.options.map((o) => o.label.trim()).filter(Boolean);
    if (labels.length < MIN_OPTIONS || labels.length > MAX_OPTIONS) {
      return {
        error: `Need between ${MIN_OPTIONS} and ${MAX_OPTIONS} options.`,
        code: "validation",
      };
    }
    if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) {
      return {
        error: "Two options share a label. Make them distinct.",
        code: "validation",
      };
    }
    if (labels.some((l) => l.length > MAX_OPTION)) {
      return {
        error: `Option is too long — keep each under ${MAX_OPTION} characters.`,
        code: "validation",
      };
    }

    await db.delete(pollOption).where(eq(pollOption.pollId, target.id));
    await db.insert(pollOption).values(
      labels.map((label, position) => ({ pollId: target.id, label, position })),
    );
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await db.update(poll).set(updates).where(eq(poll.id, pollId));
  }

  return { success: true };
}
