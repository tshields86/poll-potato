import { headers } from "next/headers";

const WINDOW_MS = 60_000;
const MAX_HITS = 20;

/**
 * Sliding-window per-IP limiter. Keeps the last `WINDOW_MS` of timestamps
 * per IP in a process-local Map. Good enough for v1 anti-spam on top of the
 * cookie/account dedup; on Workers each isolate has its own Map, so the
 * effective limit per user is somewhat looser than the constant suggests.
 * Upgrade path: move the bucket into Postgres or a Durable Object.
 */
const buckets = new Map<string, number[]>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

export async function rateLimitByIp(key: string): Promise<RateLimitResult> {
  const ip = await readIp();
  const id = `${key}:${ip}`;
  const now = Date.now();
  const previous = (buckets.get(id) ?? []).filter((t) => t > now - WINDOW_MS);
  if (previous.length >= MAX_HITS) {
    const retryAfterMs = WINDOW_MS - (now - previous[0]);
    return { ok: false, retryAfterMs };
  }
  previous.push(now);
  buckets.set(id, previous);
  return { ok: true };
}

async function readIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}
