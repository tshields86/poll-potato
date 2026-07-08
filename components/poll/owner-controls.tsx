"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Pencil, Trash2 } from "lucide-react";
import { closePoll, deletePoll } from "@/lib/polls";

export function OwnerControls({
  pollId,
  slug,
  question,
  isClosed,
}: {
  pollId: string;
  slug: string;
  question: string;
  isClosed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClose() {
    setError(null);
    startTransition(async () => {
      const r = await closePoll(pollId);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm(`Delete "${question}"? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const r = await deletePoll(pollId);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.push("/app/my-polls");
    });
  }

  return (
    <div className="mt-10 rounded-2xl border border-line bg-surface p-5">
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-soft">
        You created this poll
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/p/${slug}/edit`}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </Link>
        {!isClosed && (
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary disabled:opacity-60"
          >
            <Lock className="h-4 w-4" aria-hidden />
            Close
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-destructive hover:text-destructive disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
