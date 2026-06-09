"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Trash2 } from "lucide-react";
import { closePoll, deletePoll } from "@/lib/polls";
import type { MyPollRow } from "@/lib/polls-read";

export function PollRow({ row }: { row: MyPollRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClose() {
    setError(null);
    startTransition(async () => {
      const r = await closePoll(row.id);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm(`Delete "${row.question}"? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const r = await deletePoll(row.id);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/p/${row.slug}`}
            className="font-display text-lg font-extrabold tracking-tight hover:underline underline-offset-4"
          >
            {row.question}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  row.isClosed ? "bg-ink-soft" : "bg-green-500"
                }`}
              />
              {row.isClosed ? "Closed" : "Open"}
            </span>
            <span className="font-mono">
              {row.totalVotes} {row.totalVotes === 1 ? "vote" : "votes"}
            </span>
            <span>{row.optionCount} options</span>
            <span>{formatDate(row.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/p/${row.slug}`}
          className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
        >
          Open
        </Link>
        {!row.isClosed && (
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
    </li>
  );
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
