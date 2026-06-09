import { eq } from "drizzle-orm";
import { db, poll, pollOption } from "../lib/db";
import { castVoteFor } from "../lib/polls-cast";
import {
  closePollFor,
  deletePollFor,
  updatePollFor,
} from "../lib/polls-edit";
import { newSlug } from "../lib/slug";

const baseUrl = process.env.PP_BASE_URL ?? "http://localhost:3344";

function assert(cond: unknown, label: string) {
  if (!cond) throw new Error(`✗ ${label}`);
  console.log(`✓ ${label}`);
}

async function plant() {
  const slug = newSlug();
  const ownerToken = `owner-${newSlug()}`;
  const question = "Pizza or Tacos?";
  const [p] = await db
    .insert(poll)
    .values({ slug, question, creatorToken: ownerToken })
    .returning();
  const options = await db
    .insert(pollOption)
    .values([
      { pollId: p.id, label: "Pizza", position: 0 },
      { pollId: p.id, label: "Tacos", position: 1 },
    ])
    .returning();
  return { id: p.id, slug, ownerToken, question, options };
}

async function main() {
  console.log("M6 verification…\n");

  // ─────────────────────────────────────────────
  // 1. Owner identity: token vs. non-owner token
  {
    const p = await plant();
    const stranger = { userId: null, creatorToken: `stranger-${newSlug()}` };
    const owner = { userId: null, creatorToken: p.ownerToken };

    const a = await closePollFor(p.id, stranger);
    assert("error" in a && a.code === "not_owner", "non-owner cannot close");

    const b = await closePollFor(p.id, owner);
    assert("success" in b && b.success, "owner can close");

    const refetched = await db.query.poll.findFirst({ where: eq(poll.id, p.id) });
    assert(refetched?.status === "closed", "DB reflects status=closed after closePoll");

    await db.delete(poll).where(eq(poll.id, p.id));
  }

  // ─────────────────────────────────────────────
  // 2. updatePoll: question + settings always editable; options only before votes
  {
    const p = await plant();
    const owner = { userId: null, creatorToken: p.ownerToken };

    const ok = await updatePollFor(
      p.id,
      {
        question: "Pizza or Tacos? Final answer.",
        allowMultiple: true,
        requireName: true,
        hideResults: true,
      },
      owner,
    );
    assert("success" in ok && ok.success, "owner can update question + settings");

    const refetched = await db.query.poll.findFirst({ where: eq(poll.id, p.id) });
    assert(refetched?.question === "Pizza or Tacos? Final answer.", "question updated");
    assert(refetched?.allowMultiple === true, "allowMultiple updated");
    assert(refetched?.requireName === true, "requireName updated");
    assert(refetched?.hideResults === true, "hideResults updated");

    // Options edit before votes — should succeed
    const optsEdit = await updatePollFor(
      p.id,
      { options: [{ label: "Pizza" }, { label: "Tacos" }, { label: "Burgers" }] },
      owner,
    );
    assert("success" in optsEdit && optsEdit.success, "options editable before any vote");
    const opts = await db.query.pollOption.findMany({
      where: eq(pollOption.pollId, p.id),
      orderBy: (o, { asc }) => asc(o.position),
    });
    assert(opts.length === 3, "3 options after replace");
    assert(opts.map((o) => o.label).join("/") === "Pizza/Tacos/Burgers", "labels in order");

    // Cast a vote (poll has requireName=true from earlier update), then try editing options
    const castResult = await castVoteFor({
      pollId: p.id,
      optionIds: [opts[0].id],
      voterName: "Bot",
      userId: null,
      voterToken: `v-${newSlug()}`,
    });
    assert("success" in castResult, "vote landed (sanity check)");
    const denied = await updatePollFor(
      p.id,
      { options: [{ label: "X" }, { label: "Y" }] },
      owner,
    );
    assert(
      "error" in denied && denied.code === "validation",
      "options locked after first vote",
    );

    // Question + settings still editable after votes
    const stillOk = await updatePollFor(
      p.id,
      { question: "Pizza or Tacos? Now with feelings." },
      owner,
    );
    assert(
      "success" in stillOk && stillOk.success,
      "question still editable after votes",
    );

    await db.delete(poll).where(eq(poll.id, p.id));
  }

  // ─────────────────────────────────────────────
  // 3. deletePoll: cascade to options + votes
  {
    const p = await plant();
    const owner = { userId: null, creatorToken: p.ownerToken };
    await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: `v-${newSlug()}`,
    });

    const stranger = { userId: null, creatorToken: `stranger-${newSlug()}` };
    const denied = await deletePollFor(p.id, stranger);
    assert("error" in denied && denied.code === "not_owner", "non-owner cannot delete");

    const ok = await deletePollFor(p.id, owner);
    assert("success" in ok && ok.success, "owner can delete");

    const gone = await db.query.poll.findFirst({ where: eq(poll.id, p.id) });
    assert(!gone, "poll row gone");
    const orphanOpts = await db.query.pollOption.findMany({
      where: (o, { eq }) => eq(o.pollId, p.id),
    });
    assert(orphanOpts.length === 0, "option rows cascaded out");
  }

  // ─────────────────────────────────────────────
  // 4. OG metadata is rendered into the page head
  {
    const p = await plant();
    const res = await fetch(`${baseUrl}/p/${p.slug}`);
    assert(res.status === 200, "share URL renders 200");
    const html = await res.text();
    assert(
      html.includes('property="og:title"') || html.includes('property=&quot;og:title&quot;'),
      "og:title present",
    );
    assert(html.includes('property="og:description"'), "og:description present");
    assert(
      html.includes('name="twitter:card"') && html.includes("summary_large_image"),
      "twitter:card present",
    );
    assert(html.includes(p.question.split(" ")[0]), "question echoed in head metadata");

    await db.delete(poll).where(eq(poll.id, p.id));
  }

  // ─────────────────────────────────────────────
  // 5. Closed poll: castVote is rejected (M4 rule still holds for closed-via-closePoll)
  {
    const p = await plant();
    await closePollFor(p.id, { userId: null, creatorToken: p.ownerToken });
    const r = await castVoteFor({
      pollId: p.id,
      optionIds: [p.options[0].id],
      userId: null,
      voterToken: `v-${newSlug()}`,
    });
    assert("error" in r && r.field === "poll", "castVote rejected after closePoll");
    await db.delete(poll).where(eq(poll.id, p.id));
  }

  console.log("\nM6 acceptance check: PASS");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nM6 acceptance check: FAIL");
    console.error(err);
    process.exit(1);
  });
