"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, QrCode as QrIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { QRCodeView } from "./qr-code";

const subscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(subscribe, () => true, () => false);

export function ShareUrl({ slug, className }: { slug: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
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
    <div className={className}>
      <div className="flex items-stretch gap-2 rounded-[13px] border-2 border-line bg-paper p-1">
        <input
          readOnly
          value={url}
          className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-ink outline-none"
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
        <button
          type="button"
          onClick={() => setShowQr((q) => !q)}
          aria-label={showQr ? "Hide QR code" : "Show QR code"}
          aria-expanded={showQr}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[10px] border-2 border-line bg-surface px-3 py-2 text-sm font-bold text-ink transition-colors hover:border-primary",
            showQr && "border-primary",
          )}
        >
          <QrIcon className="h-4 w-4" />
          QR
        </button>
      </div>
      {showQr && (
        <div className="mt-3 flex justify-center">
          <QRCodeView url={url} />
        </div>
      )}
    </div>
  );
}

function useShareUrl(slug: string): string {
  const hydrated = useHydrated();
  return hydrated && typeof window !== "undefined"
    ? `${window.location.origin}/p/${slug}`
    : `/p/${slug}`;
}
