"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionCard } from "@/components/poll/option-card";
import { castVote } from "@/lib/polls";
import type { PollView } from "@/lib/polls-read";

export function VoteView({
  poll,
  initialName = "",
}: {
  poll: PollView;
  initialName?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(poll.viewerVote);
  const [voterName, setVoterName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(optionId: string) {
    setSelected((prev) => {
      if (poll.allowMultiple) {
        return prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId];
      }
      return prev[0] === optionId ? [] : [optionId];
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setErrorField(null);
    if (selected.length === 0) {
      setError("Pick an option.");
      setErrorField("optionIds");
      return;
    }
    startTransition(async () => {
      const result = await castVote({
        pollId: poll.id,
        optionIds: selected,
        voterName: voterName || undefined,
      });
      if ("error" in result) {
        setError(result.error);
        setErrorField(result.field ?? null);
        return;
      }
      router.refresh();
    });
  }

  const hint = poll.allowMultiple
    ? "Pick one or more. You can change your vote until it closes."
    : "Pick one. You can change your vote until it closes.";

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <p className="text-sm text-ink-soft">{hint}</p>

      <div className="space-y-3">
        {poll.options.map((o) => (
          <OptionCard
            key={o.id}
            label={o.label}
            selected={selected.includes(o.id)}
            onSelect={() => toggle(o.id)}
            disabled={pending}
          />
        ))}
      </div>

      {errorField === "optionIds" && error && (
        <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>
      )}

      {poll.requireName && (
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.06em] text-ink-soft">
            Your name
          </span>
          <Input
            value={voterName}
            onChange={(e) => setVoterName(e.target.value)}
            placeholder="Required"
            required
            maxLength={50}
          />
          {errorField === "voterName" && error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-destructive">{error}</p>
          )}
        </label>
      )}

      {error && !errorField && (
        <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>
      )}

      <div className="border-t border-dashed border-line pt-5">
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Casting…" : poll.hasVoted ? "Update vote" : "Cast vote"}
        </Button>
        {poll.totalVotes !== null && (
          <p className="mt-3 text-center font-mono text-xs text-ink-soft">
            {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"} so far
          </p>
        )}
      </div>
    </form>
  );
}
