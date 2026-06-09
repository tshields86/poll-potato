# TECHNICAL_SPEC.md — PollPotato

Companion to `CLAUDE.md`. This defines *what* to build and *how* the pieces fit. Where this spec and the mock disagree on visuals, the mock wins; where they disagree on behavior, this spec wins.

---

## 1. Goals and non-goals

**Goal:** the fastest possible path from "I have a question" to "here's what the group thinks." Create a poll in seconds, share one link, watch live results.

**Non-goals (v1):** comments, ranked-choice, reactions, image options, chat, embeds, analytics dashboards, teams/orgs. Anything that turns PollPotato into a survey suite is out.

## 2. Architecture overview

- A single Next.js (App Router) codebase serves both the **marketing site** (`pollpotato.com`) and the **app** (`app.pollpotato.com`). Split by route group: `(marketing)` and `(app)`. The marketing routes are static/ISR for SEO; the app routes are dynamic.
- Data lives in **Neon Postgres**, accessed via **Drizzle** over the **Neon serverless driver** (HTTP). No raw TCP — required for Cloudflare Workers.
- **Neon Auth** handles registered-user identity (email/password, Google) — it's managed Better Auth, hosted by Neon and synced into our Postgres. Anonymous voting is handled separately by our own `voter_token` cookie, not the auth provider (see §4).
- Deployed to **Cloudflare Workers** via **OpenNext** (`@opennextjs/cloudflare`).

### Free-tier constraints to design within
- Neon free: 0.5 GB storage, scales to zero on idle and wakes on the next request (~300–500ms cold start; no manual restore, no archiving). Expect occasional cold starts; don't hold connections open in a way that defeats scale-to-zero.
- Cloudflare Workers free: 100,000 requests/day, 10ms CPU per invocation, unmetered bandwidth, **3 MB compressed Worker size limit**. Keep the bundle lean. Static asset requests don't count against the request limit; only dynamic/function calls do.
- These limits are generous for an early app. The likely first paid step is Cloudflare Workers Paid ($5/mo, 10 MB Worker) if the bundle grows — not a request-volume problem.
- Neon Auth is free up to ~60,000 monthly active users on Neon's free plan (1M is the broader ceiling) — far beyond early needs. Note "active users" here means *registered* users who authenticate; anonymous voters use a cookie token and don't count.

## 3. Data model (Drizzle / Postgres)

Neon Auth syncs authenticated (registered) users into your Neon database as a managed users table (confirm the exact schema/table name when you enable Neon Auth in the console — historically a `neon_auth` schema). Don't hand-write auth tables; reference the Neon Auth users table for the `user_id` foreign keys below. The app owns the tables below.

```
poll
  id                uuid pk default gen_random_uuid()
  slug              text unique not null         -- short id for share URLs, e.g. 8-char nanoid
  question          text not null
  creator_user_id   uuid null  fk -> user.id     -- null when created anonymously
  creator_token     text null                    -- identifies an anonymous creator (for "my polls" before signup)
  allow_multiple    boolean not null default false
  require_name      boolean not null default false
  hide_results      boolean not null default false  -- hide results until the viewer has voted
  status            text not null default 'open'    -- 'open' | 'closed'
  closes_at         timestamptz null               -- auto-close time, null = no auto-close
  created_at        timestamptz not null default now()
  updated_at        timestamptz not null default now()

poll_option
  id          uuid pk default gen_random_uuid()
  poll_id     uuid not null fk -> poll.id on delete cascade
  label       text not null
  position    integer not null               -- display order
  vote_count  integer not null default 0     -- denormalized for fast result reads
  -- index on (poll_id, position)

vote
  id           uuid pk default gen_random_uuid()
  poll_id      uuid not null fk -> poll.id on delete cascade
  option_id    uuid not null fk -> poll_option.id on delete cascade
  user_id      uuid null fk -> user.id        -- set when voter is signed in
  voter_token  text null                      -- set when voter is anonymous (dedup key)
  voter_name   text null                      -- optional display name
  created_at   timestamptz not null default now()
```

**Integrity constraints (the important part):**
- Signed-in, single-choice: unique `(poll_id, user_id)`.
- Anonymous, single-choice: unique `(poll_id, voter_token)`.
- When `allow_multiple` is true, uniqueness is `(poll_id, user_id, option_id)` / `(poll_id, voter_token, option_id)` so a voter can pick several options but not the same one twice.
- `vote_count` on `poll_option` is the read path; it is updated transactionally with each insert/delete. Treat the `vote` rows as the source of truth and `vote_count` as a cache that can be recomputed.

## 4. Auth flows (Neon Auth + our own anonymous token)

Two identity layers, intentionally separate:

- **Anonymous (default, handled by us — not Neon Auth):** no login required to create or vote. On first interaction, mint a stable `voter_token` (and `creator_token`) and store it in an httpOnly cookie. This token dedups votes and powers "my polls" before a user signs up. Neon Auth is not involved here.
- **Registered (Neon Auth):** email/password and Google, via Neon Auth's managed server (`createNeonAuth()` on the server, `createAuthClient()` on the client). The signed-in `user_id` comes from the Neon Auth users table synced into Postgres. Sessions are carried in a signed, httpOnly cookie.
- **Anonymous → account migration:** when an anonymous user signs up via Neon Auth, attach polls created with their `creator_token` and votes cast with their `voter_token` to the new Neon Auth `user_id`, so they don't lose their work. This is our own logic, keyed on the cookie tokens — unaffected by which auth provider is used.
- **Require name:** when a poll has `require_name = true`, an anonymous voter must supply `voter_name` before the vote is accepted.

> Verify early (TASKS.md M2) that Neon Auth deploys on Cloudflare Workers via OpenNext. If it doesn't, swap to self-hosted Better Auth (same library, same data model — the anonymous layer above doesn't change at all).

## 5. API surface

Implement as server actions where it fits the App Router flow; expose route handlers (`/api/...`) where an external/native client will eventually need them (keep these clean and documented for the future mobile app).

- `createPoll(input)` → `{ slug }`. Validates 1 question + 2–N options; generates slug.
- `getPoll(slug)` → poll + ordered options + `{ hasVoted, viewerVote }` for the current identity. Respects `hide_results`.
- `castVote({ pollId, optionIds, voterName? })` → updated counts. Enforces all integrity rules above; rejects on closed/expired polls; enforces `require_name`.
- `getResults(slug)` → `{ options: [{id, label, vote_count}], total }`. Cheap; used for live polling.
- `listMyPolls()` → polls owned by the current `user_id` or `creator_token`.
- `closePoll(id)`, `deletePoll(id)`, `updatePoll(id, patch)` → owner-only.
- Auth routes/handlers provided by Neon Auth (its Next.js SDK).

**Rate limiting:** apply per-IP limits on `castVote` and `createPoll` (Cloudflare provides the IP). This plus the token dedup is the v1 anti-abuse story.

## 6. Live results

- **v1:** optimistic UI on vote, then short-poll `getResults` every few seconds while a results view is open (back off when the tab is hidden). Simple, cheap, fits the free tier.
- **Upgrade path (post-v1, do not build yet):** true realtime via Cloudflare Durable Objects (SQLite backend is available on the free plan) pushing updates over WebSocket/SSE. Documented here so it isn't designed out, but polling is the v1 answer.

## 7. Sharing

- Each poll has a short `slug`. Share URL: `app.pollpotato.com/{slug}` (and a marketing-friendly `pollpotato.com/p/{slug}` redirect if useful).
- "Share link" copies the URL; "QR code" renders a QR for the same URL (generate client-side). These are visual-only in the mock — wire them up for real.
- Set Open Graph / Twitter card metadata per poll so shared links preview nicely.

## 8. Features and screens (match the mock)

- **Vote screen:** question, meta (open/closed, closes-in), options as selectable cards (highlighter swipe on the chosen one), optional name field, "Cast vote," running count.
- **Results screen:** bars + tabular-mono percentages, total votes, "you voted X," share row. Honor `hide_results` until the viewer votes.
- **Create screen:** question input, add/remove/reorder options, settings toggles (allow multiple, require name, hide results until voted, auto-close date), "Create poll."
- **Dashboard ("my polls"):** list of owned polls with status, quick actions (open results, close, edit, delete, copy link).
- **Marketing landing:** the hero from the mock — headline, subhead, primary CTA ("Start a poll"), and a live mini-result. SEO-first.

## 9. Future (not v1 — listed so it's not designed out)

- True realtime via Durable Objects.
- "Let voters add their own option."
- Native iOS/Android: either Capacitor wrapping the web app or an Expo/React Native client against the documented route handlers. This is why the API surface stays clean.
- Monetization: ads on the marketing/SEO content, and a possible "Pro" tier (remove ads, custom close rules, results export, longer retention). Cloudflare's free tier permits this; revisit hosting costs only when traffic warrants.
