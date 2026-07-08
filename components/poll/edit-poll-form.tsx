"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Lock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { updatePoll } from "@/lib/polls";
import type { EditablePoll } from "@/lib/polls-read";

type Settings = {
  allowMultiple: boolean;
  requireName: boolean;
  hideResults: boolean;
  closesAt: string;
};

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function EditPollForm({ poll }: { poll: EditablePoll }) {
  const router = useRouter();
  const locked = poll.hasVotes;
  const [question, setQuestion] = useState(poll.question);
  const [options, setOptions] = useState<string[]>(poll.options);
  const [settings, setSettings] = useState<Settings>({
    allowMultiple: poll.allowMultiple,
    requireName: poll.requireName,
    hideResults: poll.hideResults,
    closesAt: poll.closesAt ? toLocalInput(poll.closesAt) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }
  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }
  function removeOption(i: number) {
    setOptions((prev) =>
      prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i),
    );
  }
  function moveOption(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= options.length) return;
    setOptions((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updatePoll(poll.id, {
        question,
        allowMultiple: settings.allowMultiple,
        requireName: settings.requireName,
        hideResults: settings.hideResults,
        closesAt: settings.closesAt || null,
        // Options are locked once voting starts — don't send them, the backend
        // would reject the patch outright.
        ...(locked ? {} : { options: options.map((label) => ({ label })) }),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/p/${poll.slug}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7" noValidate>
      <section>
        <label
          htmlFor="question"
          className="mb-2 block text-xs font-bold uppercase tracking-[0.06em] text-ink-soft"
        >
          Question
        </label>
        <Input
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="font-display text-lg"
          placeholder="Movie night pick?"
          autoFocus
          maxLength={200}
        />
      </section>

      <section>
        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.06em] text-ink-soft">
          Options
        </label>
        {locked && (
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-ink-soft">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Options are locked — voting has started.
          </p>
        )}
        <ul className="space-y-2">
          {options.map((value, i) => (
            <li key={i} className="flex items-center gap-2">
              <span aria-hidden className="text-ink-soft">
                <GripVertical className="h-4 w-4" />
              </span>
              <Input
                value={value}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 text-[15px]"
                maxLength={100}
                disabled={locked}
              />
              {!locked && (
                <div className="flex flex-none gap-1">
                  <IconButton
                    ariaLabel={`Move option ${i + 1} up`}
                    onClick={() => moveOption(i, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    ariaLabel={`Move option ${i + 1} down`}
                    onClick={() => moveOption(i, 1)}
                    disabled={i === options.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    ariaLabel={`Remove option ${i + 1}`}
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                  >
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              )}
            </li>
          ))}
        </ul>
        {!locked && (
          <button
            type="button"
            onClick={addOption}
            className="mt-3 inline-flex items-center gap-1.5 py-2 text-sm font-bold text-primary hover:underline underline-offset-4"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add option
          </button>
        )}
      </section>

      <section className="border-t border-line pt-5 space-y-4">
        <Toggle
          id="allow-multiple"
          label="Allow multiple answers"
          hint="Voters can pick more than one"
          checked={settings.allowMultiple}
          onChange={(v) => setSettings((s) => ({ ...s, allowMultiple: v }))}
        />
        <Toggle
          id="require-name"
          label="Require a name"
          hint="No anonymous votes"
          checked={settings.requireName}
          onChange={(v) => setSettings((s) => ({ ...s, requireName: v }))}
        />
        <Toggle
          id="hide-results"
          label="Hide results until voted"
          hint="Avoid bandwagon effect"
          checked={settings.hideResults}
          onChange={(v) => setSettings((s) => ({ ...s, hideResults: v }))}
        />
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Close automatically
          </span>
          <span className="mb-2 block text-xs font-medium text-ink-soft">
            Optional — set a future date and time
          </span>
          <Input
            type="datetime-local"
            value={settings.closesAt}
            onChange={(e) =>
              setSettings((s) => ({ ...s, closesAt: e.target.value }))
            }
            className="font-sans text-[15px]"
          />
        </label>
      </section>

      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/p/${poll.slug}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function IconButton({
  ariaLabel,
  onClick,
  disabled,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-[10px] border border-line text-ink-soft transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
