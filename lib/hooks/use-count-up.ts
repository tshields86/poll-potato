"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Animates from the previous value to `target` over `durationMs` with an
 * ease-out cubic curve. Under prefers-reduced-motion the value snaps.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const lastTargetRef = useRef(target);

  useEffect(() => {
    if (reduced) return; // reduced-motion branch returns `target` directly below
    if (target === lastTargetRef.current) return;

    const from = fromRef.current;
    const to = target;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      setValue(next);
      fromRef.current = next;
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        fromRef.current = to;
        lastTargetRef.current = to;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduced]);

  return reduced ? target : value;
}
