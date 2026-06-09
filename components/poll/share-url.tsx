"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShareUrl({ slug, className }: { slug: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = useShareUrl(slug);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API blocked — fall back to selecting the input
    }
  }

  return (
    <div
      className={cn(
        "flex items-stretch gap-2 rounded-[13px] border-2 border-line bg-paper p-1",
        className,
      )}
    >
      <input
        readOnly
        value={url}
        className="flex-1 bg-transparent px-3 font-mono text-sm text-ink outline-none"
        onClick={(e) => e.currentTarget.select()}
        aria-label="Share link"
      />
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Link copied" : "Copy link"}
        className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function useShareUrl(slug: string): string {
  if (typeof window === "undefined") return `/p/${slug}`;
  return `${window.location.origin}/p/${slug}`;
}
