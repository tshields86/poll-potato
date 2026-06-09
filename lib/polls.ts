"use server";

import { eq } from "drizzle-orm";
import { db, poll, pollOption } from "./db";
import { getIdentity } from "./identity";
import { ensureAnonymousIdentity } from "./identity-actions";
import { newSlug } from "./slug";

const MAX_QUESTION = 200;
const MAX_OPTION = 100;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;
const SLUG_MAX_ATTEMPTS = 5;

export type CreatePollInput = {
  question: string;
  options: string[];
  allowMultiple?: boolean;
  requireName?: boolean;
  hideResults?: boolean;
  closesAt?: string | null;
};

export type CreatePollError =
  | { error: string; field?: "question" | "options" | "closesAt" };

export type CreatePollResult = { success: true; slug: string } | CreatePollError;

export async function createPoll(input: CreatePollInput): Promise<CreatePollResult> {
  const question = (input.question ?? "").trim();
  if (!question) return { error: "Add a question.", field: "question" };
  if (question.length > MAX_QUESTION) {
    return {
      error: `Question is too long — keep it under ${MAX_QUESTION} characters.`,
      field: "question",
    };
  }

  const options = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
  if (options.length < MIN_OPTIONS) {
    return { error: `Add at least ${MIN_OPTIONS} options.`, field: "options" };
  }
  if (options.length > MAX_OPTIONS) {
    return { error: `Too many options — keep it under ${MAX_OPTIONS}.`, field: "options" };
  }
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
    return { error: "Two options have the same label. Make them distinct.", field: "options" };
  }
  for (const o of options) {
    if (o.length > MAX_OPTION) {
      return {
        error: `Option is too long — keep each under ${MAX_OPTION} characters.`,
        field: "options",
      };
    }
  }

  let closesAt: Date | null = null;
  if (input.closesAt) {
    const d = new Date(input.closesAt);
    if (Number.isNaN(d.getTime())) {
      return { error: "Couldn't read that close date.", field: "closesAt" };
    }
    if (d.getTime() <= Date.now()) {
      return { error: "Close date has to be in the future.", field: "closesAt" };
    }
    closesAt = d;
  }

  const identity = await getIdentity();
  let creatorUserId: string | null = null;
  let creatorToken: string;
  if (identity.kind === "user") {
    creatorUserId = identity.userId;
    creatorToken =
      identity.creatorToken ?? (await ensureAnonymousIdentity()).creatorToken;
  } else {
    creatorToken = (await ensureAnonymousIdentity()).creatorToken;
  }

  for (let attempt = 0; attempt < SLUG_MAX_ATTEMPTS; attempt++) {
    const slug = newSlug();
    let createdId: string | null = null;
    try {
      const [created] = await db
        .insert(poll)
        .values({
          slug,
          question,
          creatorUserId,
          creatorToken,
          allowMultiple: !!input.allowMultiple,
          requireName: !!input.requireName,
          hideResults: !!input.hideResults,
          closesAt,
        })
        .returning();
      createdId = created.id;

      await db.insert(pollOption).values(
        options.map((label, position) => ({
          pollId: created.id,
          label,
          position,
        })),
      );

      return { success: true, slug };
    } catch (err) {
      // Slug collided — pick a new one and retry.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("poll_slug_unique") || msg.includes("23505")) continue;
      // Options insert failed after poll was created — clean up.
      if (createdId) {
        await db.delete(poll).where(eq(poll.id, createdId)).catch(() => null);
      }
      throw err;
    }
  }
  return { error: "Couldn't generate a unique share link. Please try again." };
}
