"use client";

import { useState } from "react";
import { VoteView } from "@/components/poll/vote-view";
import { ResultsView } from "@/components/poll/results-view";
import type { PollView } from "@/lib/polls-read";

/**
 * Wraps the vote form for polls whose results are public (hide_results off) but
 * where the viewer hasn't voted yet. Leads with the vote form and lets them peek
 * at live results without voting, then step back to cast a vote. Once they vote,
 * the page re-renders server-side into the plain results view, so this toggle
 * only exists for the pre-vote state.
 */
export function VotePanel({
  poll,
  viewerName,
}: {
  poll: PollView;
  viewerName: string;
}) {
  const [mode, setMode] = useState<"vote" | "results">("vote");

  if (mode === "results") {
    return (
      <ResultsView
        poll={poll}
        viewerName={viewerName}
        onBackToVote={() => setMode("vote")}
      />
    );
  }

  return (
    <VoteView
      poll={poll}
      initialName={viewerName}
      onViewResults={() => setMode("results")}
    />
  );
}
