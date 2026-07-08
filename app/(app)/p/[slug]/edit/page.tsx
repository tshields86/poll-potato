import Link from "next/link";
import { notFound } from "next/navigation";
import { getPollForEdit } from "@/lib/polls-read";
import { EditPollForm } from "@/components/poll/edit-poll-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit poll",
  robots: { index: false },
};

type Params = { slug: string };

export default async function EditPollPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const poll = await getPollForEdit(slug);
  // Null covers both "no such poll" and "not the owner" — either way there's
  // nothing to edit here.
  if (!poll) notFound();

  return (
    <section className="mx-auto max-w-xl px-[clamp(18px,5vw,56px)] py-10">
      <Link
        href={`/p/${slug}`}
        className="text-sm font-bold text-primary hover:underline underline-offset-4"
      >
        ← Back to poll
      </Link>
      <h1 className="mt-4 mb-6 font-display text-3xl font-extrabold tracking-tight">
        Edit poll
      </h1>
      <EditPollForm poll={poll} />
    </section>
  );
}
