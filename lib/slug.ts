import { customAlphabet } from "nanoid";

// URL-friendly alphabet: lowercase letters + digits, excluding lookalikes
// (no 0/o, no 1/l/i). 30 chars × 8 length ≈ 6.5 × 10^11 — plenty for v1.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const nano = customAlphabet(ALPHABET, 8);

export function newSlug(): string {
  return nano();
}
