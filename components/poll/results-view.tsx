"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PollView } from "@/lib/polls-read";
import { Button } from "@/components/ui/button";
import { ShareUrl } from "@/components/poll/share-url";
import { VoteView } from "@/components/poll/vote-view";

export function ResultsView({ poll }: { poll: PollView }) {
  const [editing, setEditing] = useState(false);

  if (editing && !poll.isClosed) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          type="button"
          onClick={() => setEditing(false)}
        >
          ← Back to results
        </Button>
        <VoteView poll={poll} />
      </div>
    );
  }

  const total = poll.totalVotes ?? 0;
  const max = poll.options.reduce(
    (acc, o) => Math.max(acc, o.voteCount ?? 0),
    0,
  );
  const votedLabels = poll.options
    .filter((o) => poll.viewerVote.includes(o.id))
    .map((o) => o.label);

  return (
    <div className="space-y-5">
      {votedLabels.length > 0 && (
        <p className="inline-flex items-center gap-2 rounded-full bg-mark px-3.5 py-2 text-sm font-bold text-mark-ink">
          <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
          You voted {votedLabels.join(", ")}
        </p>
      )}

      <ol className="space-y-4">
        {poll.options.map((o) => {
          const count = o.voteCount ?? 0;
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);
          const win = count > 0 && count === max;
          return (
            <li key={o.id}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className={cn("text-[15px] font-semibold", win && "")}>
                  {o.label}
                  {win && (
                    <span aria-hidden className="ml-1.5 text-xs text-primary">
                      ✦
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "font-mono text-[15px] font-bold",
                    win && "text-primary",
                  )}
                >
                  {pct}%
                </span>
              </div>
              <div className="h-[34px] overflow-hidden rounded-[11px] bg-bar-track">
                <div
                  className="h-full rounded-[11px] bg-bar transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <ShareUrl slug={poll.slug} />

      <div className="flex items-center justify-between gap-3 font-mono text-xs text-ink-soft">
        <span>
          {total} {total === 1 ? "vote" : "votes"}
          {poll.isClosed && " · final"}
        </span>
        {!poll.isClosed && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-sans font-bold text-primary hover:underline underline-offset-4"
          >
            Change my vote
          </button>
        )}
      </div>
    </div>
  );
}
