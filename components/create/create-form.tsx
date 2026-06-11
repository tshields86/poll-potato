"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { createPoll } from "@/lib/polls";

type Settings = {
  allowMultiple: boolean;
  requireName: boolean;
  hideResults: boolean;
  closesAt: string;
};

const INITIAL_OPTIONS = ["", ""];

export function CreateForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(INITIAL_OPTIONS);
  const [settings, setSettings] = useState<Settings>({
    allowMultiple: false,
    requireName: false,
    hideResults: false,
    closesAt: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
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
    setErrorField(null);
    startTransition(async () => {
      const result = await createPoll({
        question,
        options,
        allowMultiple: settings.allowMultiple,
        requireName: settings.requireName,
        hideResults: settings.hideResults,
        closesAt: settings.closesAt || null,
      });
      if ("error" in result) {
        setError(result.error);
        setErrorField(result.field ?? null);
        return;
      }
      router.push(`/p/${result.slug}?just-created=1`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7" noValidate>
      <section>
        <label htmlFor="question" className="mb-2 block text-xs font-bold uppercase tracking-[0.06em] text-ink-soft">
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
        {errorField === "question" && error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-destructive">{error}</p>
        )}
      </section>

      <section>
        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.06em] text-ink-soft">
          Options
        </label>
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
              />
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
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addOption}
          className="mt-3 inline-flex items-center gap-1.5 py-2 text-sm font-bold text-primary hover:underline underline-offset-4"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add option
        </button>
        {errorField === "options" && error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-destructive">{error}</p>
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
          <span className="mb-2 block text-sm font-semibold">Close automatically</span>
          <span className="mb-2 block text-xs font-medium text-ink-soft">
            Optional — set a future date and time
          </span>
          <Input
            type="datetime-local"
            value={settings.closesAt}
            onChange={(e) => setSettings((s) => ({ ...s, closesAt: e.target.value }))}
            className="font-sans text-[15px]"
          />
        </label>
        {errorField === "closesAt" && error && (
          <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>
        )}
      </section>

      {error && !errorField && (
        <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Creating…" : "Create poll"}
      </Button>
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
