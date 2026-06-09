# CLAUDE.md — PollPotato

This is the entry point for building PollPotato. Read this first, then `TECHNICAL_SPEC.md` (architecture, data model, API) and `TASKS.md` (the sequenced build plan). The approved visual is `pollpotato-mock.html` — open it; it is the design source of truth.

---

## What we're building

PollPotato is a poll app. You ask a question, share one link, and watch the group answer. It does **polls and only polls**, and it does that well. It is not a survey platform, a forum, a social network, or a quiz tool, and it should never drift into becoming one.

- Marketing site: `pollpotato.com`
- App: `app.pollpotato.com`

## Naming (keep these consistent)

- **Brand / wordmark / UI copy:** PollPotato (the name users see)
- **Domain:** pollpotato.com (app at app.pollpotato.com)
- **Repo / folder / npm package / import paths:** `poll-potato` (kebab-case, lowercase)

Use `poll-potato` everywhere tooling expects an identifier; use "PollPotato" everywhere a human reads it.

## Product principles (these are guardrails, treat them as constraints)

1. **Do polls well; resist scope creep.** Before building any feature, ask: *does this help someone ask a question and see what a group thinks?* If not, it's out of scope.
2. **In scope for v1:** create a poll; single- or multiple-choice; vote anonymously (name optional) or signed in; live results; share via link + QR; an owner dashboard; a small set of poll settings (allow multiple, require name, hide results until voted, auto-close date).
3. **Explicitly out of scope** (do not build without an explicit decision): comments/threads, ranked-choice voting, reactions, image options, in-poll chat, embeds. "Let voters add their own option" is the only thing on the maybe-later list.
4. **Be honest about vote integrity.** Anonymous voting cannot be made bulletproof. Make casual double-voting *annoying* (per-poll token + rate limiting) and offer "require an account" for polls that actually matter. Never imply anonymous votes are secure.
5. **Mobile-first, always.** Design every screen for a phone first, then scale up to desktop. Light and dark mode are both first-class.

## Tech stack (locked — do not substitute without flagging)

- **Framework:** Next.js (App Router, TypeScript). Prefer React Server Components for reads and server actions / route handlers for mutations.
- **Styling:** Tailwind CSS + shadcn/ui, **heavily themed** to the tokens below. Use `next-themes` for light/dark. Do not ship default shadcn styling — it must look like the mock, not like stock shadcn.
- **Database:** Neon (serverless Postgres). Use the **Neon serverless driver** (`@neondatabase/serverless`), which speaks HTTP/WebSocket. This is required because Cloudflare Workers cannot open raw TCP connections — do not use `node-postgres`/`pg` with a direct TCP connection.
- **ORM:** Drizzle. The Drizzle schema is the source of truth for the database; migrations are checked in.
- **Auth:** **Neon Auth** — Neon's managed authentication, which is Better Auth hosted by Neon and auto-synced into your Postgres. Use it for registered users: email/password and Google OAuth. Configure via the Neon Console (`NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`); SDKs are `@neondatabase/auth/next` (client) and `@neondatabase/auth/next/server` (`createNeonAuth()`). **Anonymous voting does NOT go through Neon Auth** — it uses our own `voter_token` cookie (see TECHNICAL_SPEC.md), so the "no sign-up to vote" flow is the same regardless of auth provider. **Fallback:** if Neon Auth doesn't deploy cleanly on Cloudflare Workers (verify this first — see TASKS.md M2), drop to self-hosted Better Auth, which is the same library and known to work on Workers; the data model and concepts carry over unchanged.
- **Hosting:** Cloudflare Workers via `@opennextjs/cloudflare` (OpenNext). Local dev uses standard `next dev`.

Rationale lives in `TECHNICAL_SPEC.md`. The guiding theme is **"free as long as possible"**: Neon scales to zero (no pausing/archiving of inactive projects), and Cloudflare's free tier permits commercial use with unmetered bandwidth.

## Portability rule (important)

We start on Cloudflare, but the app must stay portable. **Do not use host-proprietary services** (no Vercel KV/Postgres/Blob; avoid Cloudflare-only primitives we can't replace). Keep state in Neon and logic in standard Next.js. The two intentional exceptions are the OpenNext build/deploy config (Cloudflare) and Neon Auth (Neon) — both are accepted because we're committed to Neon and Cloudflare anyway. Auth is the one place we trade some portability for less work; the escape hatch is that Neon Auth is just managed Better Auth, so moving to self-hosted Better Auth later is a swap within the same library, not a rewrite. Everything else stays host- and DB-agnostic.

## Design system (source of truth: the approved mock)

Direction is **"Recess"** — playful, social, tactile. Pull exact values from `pollpotato-mock.html`.

**Color tokens (CSS variables):**

| Token | Light | Dark |
|---|---|---|
| `--paper` (page bg) | `#F1F2FB` | `#100E24` |
| `--surface` (cards) | `#FFFFFF` | `#1B1840` |
| `--ink` (text) | `#211B4E` | `#ECEAFF` |
| `--ink-soft` (muted) | `#5F5A8A` | `#A09BD2` |
| `--line` (borders) | `#E6E5F4` | `#2D2956` |
| `--primary` | `#4F46E5` | `#938CFF` |
| `--primary-soft` | `#EAE8FC` | `#272358` |
| `--bar` (result fill) | `#4F46E5` | `#7E75FF` |
| `--bar-track` | `#ECECF6` | `#262252` |
| `--mark` (highlighter) | `#C9F25C` | `#C9F25C` |
| `--mark-ink` (text on mark) | `#27340A` | `#16210A` |

**Type:** Display = **Bricolage Grotesque** (700/800, headings, buttons, wordmark). Body = **Hanken Grotesk** (400–700). Numbers/data = **Space Mono** — all percentages and vote counts render in Space Mono (tabular, "scoreboard" feel).

**Signature element:** the selected option gets a **highlighter swipe** — a lime (`--mark`) marker covering the whole word with **dark ink text** (`--mark-ink`). This must stay legible in both modes: never place light text over the lime. Result bars fill with a smooth ease-out; percentages count up.

**Radii:** generous — option cards ~16px, inputs ~13px, buttons ~14px. CTAs use the display font.

**Mascot:** a friendly potato rendered in brand colors (indigo body, lime sprout + smile) is the brand character. It bobs gently in the marketing hero, shows an expectant face in empty states (e.g. "No votes yet — be the first"), and hops as the loading/cold-start indicator (the cold start is real: Neon wakes from idle). See `pollpotato-mock.html` for all three. Respect `prefers-reduced-motion` (no bob/hop). Keep it an accent — never let it crowd the actual poll.

**Quality floor (non-negotiable):** responsive down to a 360px phone; visible keyboard focus on every interactive element; `prefers-reduced-motion` respected (disable bar fills / pulses / mascot motion); real empty and error states written in the interface's voice (say what to do next, don't apologize, don't be vague).

## Copy conventions

Sentence case, active voice, plain verbs, no filler. An action keeps its name through the whole flow: the button says "Cast vote," the confirmation says "Vote cast." Name things by what the user controls, not how the system works. Empty states are invitations to act; errors explain what happened and how to fix it.

## Code conventions

- TypeScript strict mode everywhere.
- shadcn primitives live in `components/ui` and are themed via the tokens above.
- Mutations go through server actions or route handlers; reads prefer RSC.
- Keep the data access layer thin and in one place (`lib/db`), so swapping hosts never means rewriting query code.
- Write the schema, migrations, and seed data before building UI that depends on them.

## Git workflow

- Commit frequently — small, focused commits at each meaningful step rather than batching work into one large commit.
- Do **not** include the `Co-Authored-By: Claude` trailer or any "Generated with Claude Code" signature in commit messages or PR bodies.

## Map of the docs

- `TECHNICAL_SPEC.md` — architecture, data model, auth flows, API surface, features, deployment.
- `TASKS.md` — the build plan, sequenced into milestones. Work top to bottom and check items off.
- `pollpotato-mock.html` — the visual source of truth.
