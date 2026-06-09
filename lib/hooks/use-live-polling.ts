"use client";

import { useEffect, useState } from "react";

type Options<T> = {
  url: string;
  initial: T;
  intervalMs?: number;
  /** Stop polling when this returns true (e.g. poll has closed). */
  isFinal?: (data: T) => boolean;
};

/**
 * Short-polls a JSON endpoint on a fixed interval. Pauses while the document
 * is hidden (visibility change → resume immediately). Stops once `isFinal`
 * returns true. No exponential back-off in v1 — the spec asks for "every few
 * seconds" with hidden-tab pause, which is what this does.
 */
export function useLivePolling<T>({
  url,
  initial,
  intervalMs = 4000,
  isFinal,
}: Options<T>): T {
  const [data, setData] = useState<T>(initial);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const stop = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = (delayMs: number) => {
      stop();
      timer = setTimeout(tick, delayMs);
    };

    const tick = async () => {
      if (cancelled) return;
      if (document.hidden) {
        schedule(intervalMs);
        return;
      }
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          const json = (await res.json()) as T;
          setData(json);
          if (isFinal?.(json)) {
            stop();
            return;
          }
        }
      } catch {
        // ignore transient fetch errors; we'll try again next interval
      }
      schedule(intervalMs);
    };

    const onVisibility = () => {
      if (!document.hidden) {
        // Tab regained focus: fetch right away rather than wait for the next tick.
        schedule(0);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    schedule(intervalMs);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [url, intervalMs, isFinal]);

  return data;
}
