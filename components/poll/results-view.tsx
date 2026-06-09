"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PollView } from "@/lib/polls-read";
import type { ResultsSnapshot } from "@/lib/polls-read";
import { useLivePolling } from "@/lib/hooks/use-live-polling";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { Button } from "@/components/ui/button";
import { ShareUrl } from "@/components/poll/share-url";
import { VoteView } from "@/components/poll/vote-view";

export function ResultsView({ poll }: { poll: PollView }) {
  const [editing, setEditing] = useState(false);

  const initialSnapshot: ResultsSnapshot = useMemo(
    () => ({
      slug: poll.slug,
      status: poll.status,
      isClosed: poll.isClosed,
      resultsHidden: poll.resultsHidden,
      total: poll.totalVotes,
      options: poll.options.map((o) => ({ id: o.id, voteCount: o.voteCount })),
    }),
    [poll],
  );

  const live = useLivePolling<ResultsSnapshot>({
    url: `/api/polls/${poll.slug}/results`,
    initial: initialSnapshot,
    intervalMs: 4000,
    isFinal: (s) => s.isClosed,
  });

  if (editing && !poll.isClosed) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" type="button" onClick={() => setEditing(false)}>
          ← Back to results
        </Button>
        <VoteView poll={poll} />
      </div>
    );
  }

  const total = live.total ?? 0;
  const counts = new Map(live.options.map((o) => [o.id, o.voteCount ?? 0]));
  const max = Math.max(0, ...Array.from(counts.values()));
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
          const count = counts.get(o.id) ?? 0;
          const pct = total === 0 ? 0 : (count / total) * 100;
          const win = count > 0 && count === max;
          return (
            <ResultRow
              key={o.id}
              label={o.label}
              percent={pct}
              win={win}
            />
          );
        })}
      </ol>

      <ShareUrl slug={poll.slug} />

      <div
        className="flex items-center justify-between gap-3 font-mono text-xs text-ink-soft"
        aria-live="polite"
      >
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

function ResultRow({
  label,
  percent,
  win,
}: {
  label: string;
  percent: number;
  win: boolean;
}) {
  const animatedPct = useCountUp(percent);
  const displayPct = Math.round(animatedPct);

  return (
    <li>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[15px] font-semibold">
          {label}
          {win && (
            <span aria-hidden className="ml-1.5 text-xs text-primary">
              ✦
            </span>
          )}
        </span>
        <span
          className={cn(
            "font-mono text-[15px] font-bold tabular-nums",
            win && "text-primary",
          )}
        >
          {displayPct}%
        </span>
      </div>
      <div className="h-[34px] overflow-hidden rounded-[11px] bg-bar-track">
        <div
          className="h-full rounded-[11px] bg-bar transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${animatedPct}%` }}
        />
      </div>
    </li>
  );
}
