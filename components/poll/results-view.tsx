"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OptionVoter, PollView } from "@/lib/polls-read";
import type { ResultsSnapshot } from "@/lib/polls-read";
import { useLivePolling } from "@/lib/hooks/use-live-polling";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { Button } from "@/components/ui/button";
import { ShareUrl } from "@/components/poll/share-url";
import { VoteView } from "@/components/poll/vote-view";

export function ResultsView({ poll }: { poll: PollView }) {
  const [editing, setEditing] = useState(false);
  // Optimistic vote shown after the user updates from edit mode — router.refresh()
  // hasn't necessarily propagated by the time they bounce back to results, and
  // poll.viewerVote would otherwise still show the prior selection. Cleared when
  // the refreshed poll prop arrives.
  const [optimisticVote, setOptimisticVote] = useState<string[] | null>(null);
  useEffect(() => {
    setOptimisticVote(null);
  }, [poll]);
  const viewerVote = optimisticVote ?? poll.viewerVote;

  const initialSnapshot: ResultsSnapshot = useMemo(
    () => ({
      slug: poll.slug,
      status: poll.status,
      isClosed: poll.isClosed,
      resultsHidden: poll.resultsHidden,
      total: poll.totalVotes,
      options: poll.options.map((o) => ({
        id: o.id,
        voteCount: o.voteCount,
        voters: o.voters,
      })),
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
        <VoteView
          poll={poll}
          onSuccess={(newVote) => {
            setOptimisticVote(newVote);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  const total = live.total ?? 0;
  const counts = new Map(live.options.map((o) => [o.id, o.voteCount ?? 0]));
  const voters = new Map(live.options.map((o) => [o.id, o.voters]));
  const max = Math.max(0, ...Array.from(counts.values()));
  const votedLabels = poll.options
    .filter((o) => viewerVote.includes(o.id))
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
              voters={voters.get(o.id) ?? null}
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
  voters,
}: {
  label: string;
  percent: number;
  win: boolean;
  voters: OptionVoter[] | null;
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
      {voters && voters.length > 0 && <VoterChips voters={voters} />}
    </li>
  );
}

const CHIP_CAP = 6;

function VoterChips({ voters }: { voters: OptionVoter[] }) {
  const [expanded, setExpanded] = useState(false);
  const overflow = voters.length - CHIP_CAP;

  let visible = voters;
  if (!expanded && overflow > 0) {
    visible = voters.slice(0, CHIP_CAP);
    // Always keep the viewer's own chip in view, even if it sorts past the cap.
    const youIndex = voters.findIndex((v) => v.isYou);
    if (youIndex >= CHIP_CAP) visible = [...visible.slice(0, -1), voters[youIndex]];
  }

  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {visible.map((v, i) => (
        <li
          key={`${v.name}-${i}`}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            v.isYou
              ? "bg-mark font-bold text-mark-ink"
              : "bg-primary-soft text-ink",
          )}
        >
          {v.name}
          {v.isYou && " (you)"}
        </li>
      ))}
      {overflow > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:text-primary"
          >
            {expanded ? "Show less" : `+${overflow} more`}
          </button>
        </li>
      )}
    </ul>
  );
}
